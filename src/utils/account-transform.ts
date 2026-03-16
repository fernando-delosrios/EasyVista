import { parse } from 'date-fns'
import { Account } from '../model/account'
import { CONTRACT_DATES } from '../constants'

const CREATE_DATE_FORMAT = 'dd/MM/yyyy'
const READ_DATE_FORMAT = 'yyyy-MM-dd'

export const urlToID = (url: string): string => {
    const id = url.split('/').pop()
    return id ? id : ''
}

const resolveGroupIdsFromRaw = (rawAccount: any): string[] | null => {
    const rawGroups = rawAccount?.GROUPS ?? rawAccount?.groups
    if (!Array.isArray(rawGroups)) {
        return null
    }

    return rawGroups
        .map((group) => {
            if (typeof group === 'string') {
                return urlToID(group)
            }
            if (group && typeof group === 'object') {
                const byHref = typeof group.HREF === 'string' ? urlToID(group.HREF) : ''
                if (byHref) {
                    return byHref
                }
                if (typeof group.GROUP_ID === 'string') {
                    return group.GROUP_ID
                }
            }
            return ''
        })
        .filter((groupId) => groupId !== '')
}

const normalizeAccountDates = (account: Account): void => {
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
}

export const processAccountInput = (input: any): any => {
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
    if (account.attributes) {
        delete account.attributes.GROUPS
    }

    return account
}

type BuildAccountOptions = {
    fetchGroupIds?: (identity: string) => Promise<string[]>
}

export const buildAccount = async (rawAccount: any, options: BuildAccountOptions = {}): Promise<Account> => {
    const account = new Account(rawAccount)
    normalizeAccountDates(account)

    const inlineGroupIds = resolveGroupIdsFromRaw(rawAccount)
    if (inlineGroupIds) {
        account.attributes.GROUPS = inlineGroupIds
        return account
    }

    if (options.fetchGroupIds) {
        account.attributes.GROUPS = await options.fetchGroupIds(account.identity)
    } else {
        account.attributes.GROUPS = []
    }

    return account
}
