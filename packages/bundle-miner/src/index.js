'use strict'

/** @module bundle-miner */

const { tritsToValue, valueToTrits } = require('@iota/converter')
const Kerl = require('@iota/kerl')
const Signing = require('@iota/signing')
const {
    ADDRESS_LENGTH,
    VALUE_LENGTH,
    OBSOLETE_TAG_LENGTH,
    BUNDLE_LENGTH,
    TAG_LENGTH,
    TRANSACTION_LENGTH,
    TRANSACTION_ESSENCE_LENGTH,
    transactionEssence,
} = require('@iota/transaction')

const { MAX_TRYTE_VALUE, MIN_TRYTE_VALUE, NORMALIZED_FRAGMENT_LENGTH } = Signing

function minNormalizedBundle(normalizedBundles, numberOfFragments) {
    const min = new Int8Array(numberOfFragments * NORMALIZED_FRAGMENT_LENGTH).fill(MIN_TRYTE_VALUE)

    for (let i = 0; i < normalizedBundles.length; i++) {
        for (let j = 0; j < min.length; j++) {
            if (MAX_TRYTE_VALUE - normalizedBundles[i][j] < MAX_TRYTE_VALUE - min[j]) {
                min[j] = normalizedBundles[i][j]
            }
        }
    }

    return min
}

function bundleEssence(bundle) {
    const bundleCopy = bundle.slice()
    const essence = new Int8Array((bundle.length / TRANSACTION_LENGTH) * TRANSACTION_ESSENCE_LENGTH)

    for (let offset = 0; offset < bundle.length; offset += TRANSACTION_LENGTH) {
        essence.set(transactionEssence(bundleCopy, offset))
    }

    return essence
}

function summaryOfLosing(normalizedBundle, numberOfFragments) {
    let P = 0

    for (let i = 0; i < numberOfFragments * NORMALIZED_FRAGMENT_LENGTH; i++) {
        const Pi = 1 - (MAX_TRYTE_VALUE - normalizedBundle[i]) / (MAX_TRYTE_VALUE - MIN_TRYTE_VALUE)

        if (Pi > 0) {
            if (P === 0) {
                P = 1
            }

            P *= Pi
        }
    }

    return P
}

function securityLevel(probabilityOfLosing, radix) {
    return Math.log(1 / probabilityOfLosing) / Math.log(radix)
}

/**
 * Creates a bundle miner for a specific address reuse case.
 * The case is described by:
 * 1. Previous normalized bundle hashes which have been signed by the used private key.
 * 2. A new bundle that moves funds from the used address.
 * 3. The security level of the used address.
 *
 *
 * @method createBundleMiner
 *
 * @param {Int8Array} params.signedNormalizedBundle - Aggregated normalized bundle minimum, that has been used to produce known signatures.
 * @param {Int8Array} params.essence - Essence of bundle that sweeps funds from already used address.
 * @param {number} params.numberOfFragments - Number of fragments to mine for. Should match with security level of used address.
 * @param {number} params.offset - Index offset to start mining from.
 * @param {number} params.count - How many indexes to check.
 *
 * @return {object} - bundle miner object with start()/stop() methods.
 */
function createBundleMiner({ signedNormalizedBundle, essence, numberOfFragments, offset, count }) {
    if (signedNormalizedBundle.length < NORMALIZED_FRAGMENT_LENGTH * numberOfFragments) {
        throw new Error('Illegal `signedNormalizedBundle` length. Must correspond to `numberOfFragments`.')
    }

    if (essence.length === 0 || essence.length % TRANSACTION_ESSENCE_LENGTH !== 0) {
        throw new Error('Illegal `essence` length.')
    }

    if ([1, 2, 3].indexOf(numberOfFragments) === -1) {
        throw new Error('Illegal `numberOfFragments` value. Must be 1, 2 or 3.')
    }

    if (offset < 0 || !Number.isInteger(offset)) {
        throw new Error('Illegal `offset` value. Must be 0 or a positive integer.')
    }

    if (count <= 0 || !Number.isInteger(count)) {
        throw new Error('Illegal `count` value. Must be a positive integer.')
    }

    const sponge = new Kerl.default()
    const essenceCopy = essence.slice()
    const bundle = new Int8Array(BUNDLE_LENGTH)
    let fittestBundle = { probabilityOfLosing: 1 }
    let index = offset
    let running = false

    return {
        start() {
            if (running) {
                throw new Error('Bundle miner is already running!')
            }

            running = true

            while (running && index < offset + count) {
                essenceCopy.set(valueToTrits(index), ADDRESS_LENGTH + VALUE_LENGTH, OBSOLETE_TAG_LENGTH)
                sponge.absorb(essenceCopy, 0, essenceCopy.length)
                sponge.squeeze(bundle, 0, BUNDLE_LENGTH)

                const normalizedBundle = Signing.normalizedBundle(bundle)

                if (normalizedBundle.indexOf(MAX_TRYTE_VALUE /* 13 */) === -1) {
                    const probabilityOfLosing = summaryOfLosing(
                        minNormalizedBundle([signedNormalizedBundle, normalizedBundle], numberOfFragments),
                        numberOfFragments
                    )

                    if (probabilityOfLosing < fittestBundle.probabilityOfLosing) {
                        fittestBundle = {
                            index,
                            bundle,
                            normalizedBundle,
                            probabilityOfLosing,
                            tritSecurityLevel: securityLevel(probabilityOfLosing, 3),
                            bitSecurityLevel: securityLevel(probabilityOfLosing, 2),
                        }
                    }
                }

                sponge.reset()

                index++
            }

            running = false

            return fittestBundle
        },
        stop() {
            running = false
        },
    }
}

module.exports = {
    minNormalizedBundle,
    bundleEssence,
    summaryOfLosing,
    securityLevel,
    createBundleMiner,
}
