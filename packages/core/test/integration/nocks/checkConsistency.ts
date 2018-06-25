import * as nock from 'nock'
import { IRICommand, CheckConsistencyCommand, CheckConsistencyResponse } from '../../../../types'
import headers from './headers'

export const checkConsistencyCommand: CheckConsistencyCommand = {
    command: IRICommand.CHECK_CONSISTENCY,
    transactions: ['A'.repeat(81), 'B'.repeat(81)],
}

export const checkConsistencyResponse: CheckConsistencyResponse = {
    state: true,
}

export const checkConsistencyNock = nock('http://localhost:14265', headers)
    .persist()
    .post('/', checkConsistencyCommand)
    .reply(200, checkConsistencyResponse)
