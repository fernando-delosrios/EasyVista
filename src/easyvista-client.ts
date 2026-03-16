import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import axiosThrottle from 'axios-request-throttle'
import axiosRetry from 'axios-retry'
import { retriesConfig, throttleConfig } from './axios'
import { AxiosCacheInstance, setupCache } from 'axios-cache-interceptor'
import { ACCOUNT_ATTRIBUTES } from './constants'

export class EasyVistaClient {
    private client: AxiosCacheInstance
    private search: string

    constructor(config: any) {
        const baseConfig: AxiosRequestConfig = {
            baseURL: config.url,
        }
        if (config.auth === 'auth.basic') {
            baseConfig.auth = {
                username: config['basic.username'],
                password: config['basic.password'],
            }
        } else {
            baseConfig.headers = {
                Authorization: `Bearer ${config['token.value']}`,
            }
        }
        const client = axios.create(baseConfig)
        // Some axios middleware packages ship incompatible type declarations.
        axiosRetry(client as any, retriesConfig as any)
        axiosThrottle.use(client as any, throttleConfig as any)
        this.client = setupCache(client)
        this.search = config.search
    }

    async testConnection(): Promise<AxiosResponse> {
        const url = `/license`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async listEmployees(max_rows?: number): Promise<AxiosResponse> {
        const url = `/employees`
        const fields = ACCOUNT_ATTRIBUTES.join(',')
        const search = this.search

        if (!max_rows) {
            const response = await this.listEmployees(1)
            max_rows = response.data.total_record_count as number
        }
        const request: AxiosRequestConfig = {
            method: 'get',
            url,
            params: {
                max_rows,
                fields,
                search,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async listGroups(max_rows?: number): Promise<AxiosResponse> {
        const url = `/groups`

        if (!max_rows) {
            const response = await this.listEmployees(1)
            max_rows = response.data.total_record_count as number
        }
        const request: AxiosRequestConfig = {
            method: 'get',
            url,
            params: {
                max_rows,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async getGroup(id: string): Promise<AxiosResponse> {
        const url = `/groups/${id}`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async getAccount(id: string): Promise<AxiosResponse> {
        const url = `/employees/${id}`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async getGroupMembership(id: string): Promise<AxiosResponse> {
        const url = `/employees/${id}/groups`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async setProfil(id: string, profil: number): Promise<AxiosResponse> {
        const url = `/employees/${id}`

        const request: AxiosRequestConfig = {
            method: 'put',
            url,
            data: {
                profil_id: profil,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async updateAccount(id: string, data: any): Promise<AxiosResponse> {
        const url = `/employees/${id}`

        const request: AxiosRequestConfig = {
            method: 'put',
            url,
            data,
        }

        const response = await this.client.request(request)

        return response
    }

    async createAccount(account: any): Promise<AxiosResponse> {
        const url = `/employees`

        const request: AxiosRequestConfig = {
            method: 'post',
            url,
            data: {
                employees: [account],
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async addGroupMember(group_id: string, employee_id: string): Promise<AxiosResponse> {
        const url = `/groups/${group_id}/employees/${employee_id}`

        const request: AxiosRequestConfig = {
            method: 'post',
            url,
            data: {},
        }

        const response = await this.client.request(request)

        return response
    }

    async removeGroupMember(group_id: string, employee_id: string): Promise<AxiosResponse> {
        const url = `/groups/${group_id}/employees/${employee_id}`

        const request: AxiosRequestConfig = {
            method: 'delete',
            url,
        }

        const response = await this.client.request(request)

        return response
    }
}
