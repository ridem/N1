import _ from 'underscore'
import NylasStore from 'nylas-store'
import Actions from '../actions'

class SearchableComponentStore extends NylasStore {
  constructor() {
    super()
    this.searchTerm = ""
    this.listenTo(Actions.searchInMessages, this._searchInMessages)
    this.listenTo(Actions.nextSearchResult, this._nextSearchResult)
    this.listenTo(Actions.previousSearchResult, this._previousSearchResult)
  }

  /**
   * When components mount
   *
   */
  _nextSearchResult = () => {
    this._recalculateMatchNodes()
    this._moveGlobalIndexBy(1)

    // const sortedNodes = this.getSortedMatchNodes();
    // const focusedNode = sortedNodes[this._moveGlobalIndexBy(1)]
    //
    // if (this.numResults === 0) {
    //   this.globalIndex = 0;
    // } else {
    //   this.globalIndex = ((this.globalIndex || 0) + 1) % this.numResults;
    // }
  }

  _previousSearchResult = () => {
    this._recalculateMatchNodes()
    this._moveGlobalIndexBy(-1)
  }

  _recalculateMatchNodes() {
    const matchNodes = []
    _.each(this.searchRegions, (node) => {
      const matches = node.querySelectorAll('search-match, .search-match');
      for (let i = 0; i < matches.length; i++) {
        matchNodes.push({
          node: matches[i],
          rect: matches[i].getBoundingClientRect(),
        });
      }
    })
    matchNodes.sort((nodeA, nodeB) => {
      const aScore = nodeA.rect.top + nodeA.rect.left / 1000
      const bScore = nodeB.rect.top + nodeB.rect.left / 1000
      return aScore - bScore
    })
  }

  _searchInMessages = (search) => {
    if (search !== this.searchTerm) {
      this.searchTerm = search;
      this.globalIndex = 0;
      this.numResults = 0;
      this.trigger()
    }
  }

  getSearchTermAndIndex(regionId) {
    const searchTerm = this.searchTerm;
    let localIndex = -1;
    let matchCount = 0;
    if (this.searchRegions.length === 0) {
      return {searchTerm, localIndex: null}
    }
    for (const searchRegion of this.searchRegions) {
      if (this.globalIndex <= matchCount) {
        localIndex = matchCount - this.globalIndex
        return {searchTerm, localIndex}
      }
      matchCount += searchRegion.numMatches
    }
    this.searchRegions[this.searchRegions.length - 1]
    return {searchTerm, localIndex}
  }

  registerSearchRegion(regionId, domNode) {
    this.searchRegions[regionId] = domNode
  }

  unregisterSearchRegion(regionId) {
    delete this.searchRegions[regionId]
  }
}
export default new SearchableComponentStore()
