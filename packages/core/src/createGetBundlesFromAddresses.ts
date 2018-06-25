import * as Promise from 'bluebird'
import { createFindTransactionObjects, createGetLatestInclusion } from './'
import { Bundle, Callback, Hash, Provider, Transaction } from '../../types'

export const createGetBundlesFromAddresses = (provider: Provider, caller?: string) => {
    const findTransactionObjects = createFindTransactionObjects(provider)
    const getLatestInclusion = createGetLatestInclusion(provider)

    return function(
        addresses: ReadonlyArray<Hash>,
        inclusionStates?: boolean,
        callback?: Callback<ReadonlyArray<Bundle>>
    ): Promise<ReadonlyArray<Bundle>> {
        if (caller !== 'lib') {
            console.warn(
                '`getBundlesFromAddresses()` has been deprecated and will be removed in v2.0.0' +
                    'Please use `findTransactionObjects()` and `getBundle()` as an alternative'
            )
        }

        // 1. Get txs associated with addresses
        return (
            findTransactionObjects({ addresses })
                // 2. Get all transactions by bundle hashes
                .then(transactions =>
                    findTransactionObjects({
                        bundles: transactions.filter(tx => tx.currentIndex === 0).map(tx => tx.bundle),
                    })
                )

                // 3. Group transactions into bundles
                .then(groupTransactionsIntoBundles)

                // 4. If requested, add persistence status to each bundle
                .then(
                    (bundles: ReadonlyArray<Bundle>) =>
                        inclusionStates ? addPersistence(getLatestInclusion, bundles) : bundles
                )

                // 5. Sort bundles by timestamp
                .then(sortByTimestamp)
                .asCallback(typeof arguments[1] === 'function' ? arguments[1] : callback)
        )
    }
}

// Groups an array of transaction objects into array of bundles
export const groupTransactionsIntoBundles = (transactions: ReadonlyArray<Transaction>): ReadonlyArray<Bundle> =>
    transactions.reduce(
        (acc: ReadonlyArray<Bundle>, transaction: Transaction) =>
            transaction.currentIndex === 0 ? acc.concat([getBundleSync(transactions, transaction)]) : acc,
        []
    )

// Collects all transactions of a bundle starting from a given tail and traversing through trunk.
export const getBundleSync = (
    transactions: ReadonlyArray<Transaction>,
    transaction: Transaction,
    bundle: ReadonlyArray<Transaction> = []
): Bundle => {
    const _bundle = [...bundle]

    if (transaction.currentIndex === 0) {
        _bundle.push(transaction)
    }

    if (transaction && transaction.currentIndex !== transaction.lastIndex) {
        const nextTrunkTransaction = transactions.find(
            (nextTransaction: Transaction) =>
                nextTransaction.hash === transaction.trunkTransaction &&
                nextTransaction.bundle === transaction.bundle &&
                nextTransaction.currentIndex === transaction.currentIndex + 1
        )

        if (nextTrunkTransaction) {
            _bundle.push(nextTrunkTransaction)
            return getBundleSync(transactions, nextTrunkTransaction, _bundle)
        }
    }

    return _bundle
}

export const zip2 = <A, B>(as: ReadonlyArray<A>, bs: ReadonlyArray<B>) =>
    as.map((a, i) => {
        return [a, bs[i]] as [A, B]
    })

export const zipPersistence = (bundles: ReadonlyArray<Bundle>) => (
    states: ReadonlyArray<boolean>
): ReadonlyArray<Bundle> =>
    // Since bundles are atomic, all transactions have the same state
    zip2(bundles, states).map(([bundle, state]) => bundle.map(tx => ({ ...tx, persistence: state })))

type GetLatestInclusion = (
    transactions: ReadonlyArray<Hash>,
    callback?: Callback<ReadonlyArray<boolean>>
) => Promise<ReadonlyArray<boolean>>

export const addPersistence = (getLatestInclusion: GetLatestInclusion, bundles: ReadonlyArray<Bundle>) => {
    // Get the first hash of each bundle
    const hashes = bundles.map(bundle => bundle[0].hash)

    return getLatestInclusion(hashes).then(zipPersistence(bundles))
}

export const sortByTimestamp = (bundles: ReadonlyArray<Bundle>) =>
    [...bundles].sort(([a], [b]) => a.attachmentTimestamp - b.attachmentTimestamp)
