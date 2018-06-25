import * as Promise from 'bluebird'
import { uriArrayValidator, validate } from '@iota/validators'
import { Callback, IRICommand, Provider, RemoveNeighborsCommand, RemoveNeighborsResponse } from '../../types'

/**
 * @method createRemoveNeighbors
 *
 * @memberof module:core
 *
 * @param {Provider} provider - Network provider
 *
 * @return {function} {@link #module_core.removeNeighbors `removeNeighbors`}
 */
export const createRemoveNeighbors = ({ send }: Provider) =>
    /**
     * Removes a list of neighbors from the connected IRI node by calling
     * [`removeNeighbors`]{@link https://docs.iota.works/iri/api#endpoints/removeNeighbors} command.
     * Assumes `removeNeighbors` command is available on the node.
     *
     * This method has temporary effect until your IRI node relaunches.
     *
     * @method removeNeighbors
     *
     * @memberof module:core
     *
     * @param {Array} uris - List of URI's
     * @param {Callback} [callback] - Optional callback
     *
     * @return {Promise}
     * @fulfil {number} Number of neighbors that were removed
     * @reject {Error}
     * - `INVALID URI`: Invalid uri(s)
     * - Fetch error
     */
    (uris: ReadonlyArray<string>, callback?: Callback<number>): Promise<number> =>
        Promise.resolve(validate(uriArrayValidator(uris)))
            .then(() =>
                send<RemoveNeighborsCommand, RemoveNeighborsResponse>({
                    command: IRICommand.REMOVE_NEIGHBORS,
                    uris,
                })
            )
            .then(res => res.removedNeighbors)
            .asCallback(callback)
