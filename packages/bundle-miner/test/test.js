'use strict'

const { describe } = require('riteway')
const {
    minNormalizedBundle,
    bundleEssence,
    summaryOfLosing,
    securityLevel,
    createBundleMiner,
} = require('../src/index.js')
const { normalizedBundle, NORMALIZED_FRAGMENT_LENGTH } = require('@iota/signing')
const { TRANSACTION_LENGTH } = require('@iota/transaction')
const { trytesToTrits } = require('@iota/converter')

describe('minNormalizedBundle()', async assert => {
    const numberOfFragments = 2
    const a = new Int8Array(numberOfFragments * NORMALIZED_FRAGMENT_LENGTH).fill(0)
    const b = new Int8Array(numberOfFragments * NORMALIZED_FRAGMENT_LENGTH).fill(0)
    a.set([13], 0)
    b.set([12], 3)
    const normalizedBundles = [a, b]
    const expected = new Int8Array(numberOfFragments * NORMALIZED_FRAGMENT_LENGTH).fill(0)
    expected.set([13], 0)
    expected.set([12], 3)

    assert({
        given: 'array of normalized bundles',
        should: 'aggregate values that give minimum number of hashing rounds.',
        actual: minNormalizedBundle(normalizedBundles, numberOfFragments),
        expected,
    })
})

describe('summaryOfLosing()', async assert => {
    const numberOfFragments = 2

    assert({
        given: 'normalized bundle that gives minimum number of hashing rounds',
        should: 'return probability of losing equal to 1.',
        actual: summaryOfLosing(
            new Int8Array(numberOfFragments * NORMALIZED_FRAGMENT_LENGTH).fill(13),
            numberOfFragments
        ),
        expected: 1,
    })

    assert({
        given: 'normalized bundle that gives maximum number of hashing rounds',
        should: 'return probability of losing equal to 0.',
        actual: summaryOfLosing(
            new Int8Array(numberOfFragments * NORMALIZED_FRAGMENT_LENGTH).fill(-13),
            numberOfFragments
        ),
        expected: 0,
    })
})

describe('createBundleMiner()', async assert => {
    const normalizedBundles = [
        'QVXRKNRXFZIPFPREXRAPNHNSRFFQOWBGCAFZEGFCKDPDXRNVZQ9VJPQPPTFXKPVZVAIENQLETXRVSFKFO',
        'JKHLAKTRTDIKMTERIRYEWI9PPOJAKHZEMNCXFB9GTRZRWKSFVAZANHSPABGGQIJAVULKMPPAL9VBSRB9E',
    ]
        .map(trytesToTrits)
        .map(normalizedBundle)
    const bundle = new Int8Array(TRANSACTION_LENGTH * 4).fill(0)
    const numberOfFragments = 2

    assert({
        given: 'signed normalized bundle, sweep essence and number of fragments',
        should: 'find a good index.',
        actual: createBundleMiner({
            signedNormalizedBundle: minNormalizedBundle(normalizedBundles, numberOfFragments),
            essence: bundleEssence(bundle),
            numberOfFragments,
            offset: 0,
            count: 1000,
        }).start().index,
        expected: 722,
    })
})
