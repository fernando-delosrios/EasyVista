import {
    Context,
    createConnector,
    readConfig,
    Response,
    logger,
    StdAccountListOutput,
    StdTestConnectionOutput,
    StdAccountListInput,
    StdEntitlementListInput,
    StdEntitlementListOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    ConnectorError,
    ConnectorErrorType,
    StdAccountCreateInput,
    StdAccountCreateOutput,
    StdAccountUpdateInput,
    StdAccountUpdateOutput,
    StdAccountDisableInput,
    StdAccountDisableOutput,
    StdAccountEnableInput,
    StdAccountEnableOutput,
    StdEntitlementReadInput,
    StdEntitlementReadOutput,
    AttributeChangeOp,
    StdTestConnectionInput,
} from '@sailpoint/connector-sdk'
import { EasyVistaClient } from './easyvista-client'
import { Account } from './model/account'
import { Group } from './model/group'
import { format, parse, parseISO, subDays } from 'date-fns'
import { AxiosResponse } from 'axios'
import { CONTRACT_DATES, PROCESSINGWAIT } from './constants'

const CREATE_DATE_FORMAT = 'dd/MM/yyyy'
const READ_DATE_FORMAT = 'yyyy-MM-dd'

// Connector must be exported as module property named connector
export const connector = async () => {
    // Get connector source config
    const config = await readConfig()

    // Use the vendor SDK, or implement own client as necessary, to initialize a client
    const client = new EasyVistaClient(config)

    const urlToID = (url: string): string => {
        const id = url.split('/').pop()
        return id ? id : ''
    }

    const buildAccount = async (rawAccount: any): Promise<Account> => {
        const account = new Account(rawAccount)
        const response = await client.getGroupMembership(account.identity)
        account.attributes.GROUPS = response.data.groups.map(urlToID)
        if (account.attributes.BEGIN_OF_CONTRACT !== '') {
            const date = parse(account.attributes.BEGIN_OF_CONTRACT as string, READ_DATE_FORMAT, Date.now())
            if (Date.now() - date.valueOf() > 0) {
                account.disabled = true
            }
            account.attributes.BEGIN_OF_CONTRACT = date.toISOString()
        }
        if (account.attributes.END_OF_CONTRACT !== '') {
            const date = parse(account.attributes.END_OF_CONTRACT as string, READ_DATE_FORMAT, Date.now())
            account.attributes.END_OF_CONTRACT = date.toISOString()
        }

        return account
    }

    const processInput = (input: any): any => {
        const account = { ...input }
        for (const date of CONTRACT_DATES) {
            const originalDate = account.attributes[date]
            let newDate
            try {
                newDate = parse(originalDate, CREATE_DATE_FORMAT, new Date())
            } catch (error) {
                newDate = parse(originalDate, READ_DATE_FORMAT, new Date())
            }
            account.attributes[date] = newDate
        }
        delete account.GROUPS

        return account
    }

    const send = async <T>(res: Response<T>, output: T) => {
        logger.info(output)
        res.send(output)
    }

    return createConnector()
        .stdTestConnection(async (context: Context, input: StdTestConnectionInput, res: Response<StdTestConnectionOutput>) => {
            logger.info('Running test connection')
            const response = await client.testConnection()
            res.send({})
        })
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            const interval = setInterval(() => {
                res.keepAlive()
            }, PROCESSINGWAIT)

            const responses: Promise<any>[] = []
            try {
                const response = await client.listEmployees()

                for (const rawAccount of response.data.records) {
                    const account = buildAccount(rawAccount)
                    responses.push(account)
                    account.then((x) => send(res, x))
                }
            } finally {
                await Promise.all(responses)
                clearInterval(interval)
            }
        })
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            logger.info(input)
            try {
                const response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)
                logger.info(account)
                res.send(account)
            } catch (error) {
                throw new ConnectorError('Account not found', ConnectorErrorType.NotFound)
            }
        })
        .stdAccountCreate(
            async (context: Context, input: StdAccountCreateInput, res: Response<StdAccountCreateOutput>) => {
                logger.info(input)
                const groups = [].concat(input.attributes.GROUPS)
                const employee = processInput(input.attributes)

                let response = await client.createAccount(employee)
                const HREF: string = response.data.HREF
                const EMPLOYEE_ID = urlToID(HREF)

                for (const group of groups) {
                    if (group) {
                        response = await client.addGroupMember(group, EMPLOYEE_ID)
                    }
                }

                response = await client.getAccount(EMPLOYEE_ID)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdAccountUpdate(
            async (context: Context, input: StdAccountUpdateInput, res: Response<StdAccountUpdateOutput>) => {
                logger.info(input)
                if (input.changes) {
                    let response: AxiosResponse
                    for (const change of input.changes) {
                        const employee: any = {}
                        switch (change.attribute) {
                            case 'GROUPS':
                                if (change.op === AttributeChangeOp.Remove) {
                                    response = await client.removeGroupMember(change.value, input.identity)
                                } else {
                                    response = await client.addGroupMember(change.value, input.identity)
                                }
                                break
                            case 'PROFIL_ID':
                                response = await client.getAccount(input.identity)
                                employee.LAST_NAME = response.data.LAST_NAME
                                if (change.op === AttributeChangeOp.Remove) {
                                    employee.PROFIL_ID = ''
                                } else {
                                    employee.PROFIL_ID = change.value
                                }
                                response = await client.updateAccount(input.identity, employee)
                                break
                            default:
                                employee[change.attribute] = change.value

                                response = await client.updateAccount(input.identity, employee)
                                break
                        }
                    }
                    //Need to investigate about std:account:update operations without changes but adding this for the moment
                } else if ('attributes' in input) {
                    logger.warn(
                        'No changes detected in account update. Please report unless you used attribute sync which is not supported.'
                    )
                }

                const response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdAccountDisable(
            async (context: Context, input: StdAccountDisableInput, res: Response<StdAccountDisableOutput>) => {
                logger.info(input)
                const today = new Date()
                const yesterday = subDays(today, 1)
                const date = format(yesterday, CREATE_DATE_FORMAT)

                const employee = {
                    END_OF_CONTRACT: date,
                }

                let response = await client.updateAccount(input.identity, employee)

                response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdAccountEnable(
            async (context: Context, input: StdAccountEnableInput, res: Response<StdAccountEnableOutput>) => {
                logger.info(input)
                const employee = {
                    END_OF_CONTRACT: '',
                }

                let response = await client.updateAccount(input.identity, employee)

                response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdEntitlementList(
            async (context: Context, input: StdEntitlementListInput, res: Response<StdEntitlementListOutput>) => {
                logger.info(input)
                const response = await client.listGroups()

                for (const rawGroup of response.data.records) {
                    const group = new Group(rawGroup, config.language)
                    logger.info(group)
                    res.send(group)
                }
            }
        )
        .stdEntitlementRead(
            async (context: Context, input: StdEntitlementReadInput, res: Response<StdEntitlementReadOutput>) => {
                logger.info(input)
                const response = await client.getGroup(input.identity)

                const account = new Group(response, config.language)
                logger.info(account)
                res.send(account)
            }
        )
}
