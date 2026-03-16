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
        return this.get('/license')
    }

    private request(request: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.client.request(request)
    }

    private get(url: string, params?: Record<string, unknown>): Promise<AxiosResponse> {
        return this.request({
            method: 'get',
            url,
            params,
        })
    }

    private post(url: string, data?: Record<string, unknown>): Promise<AxiosResponse> {
        return this.request({
            method: 'post',
            url,
            data,
        })
    }

    private put(url: string, data: Record<string, unknown>): Promise<AxiosResponse> {
        return this.request({
            method: 'put',
            url,
            data,
        })
    }

    private delete(url: string): Promise<AxiosResponse> {
        return this.request({
            method: 'delete',
            url,
        })
    }

    private parseTotalRows(payload: any): number {
        const total = Number(payload?.total_record_count)
        if (Number.isFinite(total) && total > 0) {
            return total
        }
        const count = Number(payload?.record_count)
        if (Number.isFinite(count) && count > 0) {
            return count
        }
        return 1
    }

    private async resolveMaxRows(url: string, params: Record<string, unknown>): Promise<number> {
        const response = await this.get(url, {
            ...params,
            max_rows: 1,
        })
        return this.parseTotalRows(response.data)
    }

    async listEmployees(max_rows?: number): Promise<AxiosResponse> {
        const url = `/employees`
        const params: Record<string, unknown> = {
            fields: ACCOUNT_ATTRIBUTES.join(','),
            search: this.search,
        }

        if (max_rows === undefined) {
            max_rows = await this.resolveMaxRows(url, params)
        }
        return this.get(url, {
            ...params,
            max_rows,
        })
    }

    async listGroups(max_rows?: number): Promise<AxiosResponse> {
        const url = `/groups`
        const params: Record<string, unknown> = {}

        if (max_rows === undefined) {
            max_rows = await this.resolveMaxRows(url, params)
        }
        return this.get(url, {
            ...params,
            max_rows,
        })
    }

    async getGroup(id: string): Promise<AxiosResponse> {
        return this.get(`/groups/${id}`)
    }

    async getAccount(id: string): Promise<AxiosResponse> {
        return this.get(`/employees/${id}`)
    }

    async getGroupMembership(id: string): Promise<AxiosResponse> {
        return this.get(`/employees/${id}/groups`)
    }

    async setProfil(id: string, profil: number): Promise<AxiosResponse> {
        return this.put(`/employees/${id}`, {
            profil_id: profil,
        })
    }

    async updateAccount(id: string, data: any): Promise<AxiosResponse> {
        return this.put(`/employees/${id}`, data)
    }

    async createAccount(account: any): Promise<AxiosResponse> {
        return this.post('/employees', {
            employees: [account],
        })
    }

    async addGroupMember(group_id: string, employee_id: string): Promise<AxiosResponse> {
        return this.post(`/groups/${group_id}/employees/${employee_id}`, {})
    }

    async removeGroupMember(group_id: string, employee_id: string): Promise<AxiosResponse> {
        return this.delete(`/groups/${group_id}/employees/${employee_id}`)
    }
}
