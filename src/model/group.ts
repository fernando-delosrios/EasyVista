import { Attributes } from '@sailpoint/connector-sdk'

export class Group {
    identity: string
    uuid: string
    attributes: Attributes
    type = 'group'

    constructor(group: any, language: string) {
        const ATTRIBUTE = `GROUP_${language}`
        this.attributes = {
            HREF: group.HREF,
            ID: group.GROUP_ID,
            NAME: group[ATTRIBUTE],
        }

        this.identity = this.attributes.ID as string
        this.uuid = this.attributes.NAME as string
    }
}
