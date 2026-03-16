import { Attributes } from '@sailpoint/connector-sdk'

export class Account {
    identity: string
    uuid: string
    attributes: Attributes
    disabled? = false

    constructor(account: any) {
        this.attributes = {
            EMPLOYEE_ID: account.EMPLOYEE_ID,
            LAST_NAME: account.LAST_NAME,
            HREF: account.HREF,
            E_MAIL: account.E_MAIL,
            CELLULAR_NUMBER: account.CELLULAR_NUMBER,
            PHONE_NUMBER: account.PHONE_NUMBER,
            IDENTIFICATION: account.IDENTIFICATION,
            LOGIN: account.LOGIN,
            MANAGER_ID: account.MANAGER_ID,
            BEGIN_OF_CONTRACT: account.BEGIN_OF_CONTRACT,
            END_OF_CONTRACT: account.END_OF_CONTRACT,
            PROFIL_ID: account.PROFIL_ID,
            LOCATION_ID: account.LOCATION_ID,
            LOCATION_CODE: account.LOCATION.LOCATION_CODE,
            LOCATION_FR: account.LOCATION.LOCATION_FR,
            LOCATION_PATH: account.LOCATION_PATH,
            CITY: account.LOCATION.CITY,
            DEPARTMENT_ID: account.DEPARTMENT_ID,
            DEPARTMENT_CODE: account.DEPARTMENT.DEPARTMENT_CODE,
            DEPARTMENT_FR: account.DEPARTMENT.DEPARTMENT_FR,
            DEPARTMENT_PATH: account.DEPARTMENT.DEPARTMENT_PATH,
            DEPARTMENT_LABEL: account.DEPARTMENT.DEPARTMENT_LABEL,
        }

        this.identity = this.attributes.EMPLOYEE_ID as string
        this.uuid = this.attributes.LAST_NAME as string
    }
}
