import _ from 'underscore'
import NylasStore from 'nylas-store'
import Actions from '../actions'

class SearchableComponentStore extends NylasStore {
  constructor() {
    super();
    this.matchNode = null
    this.matchNodes = []
    this.matchCount = 0;
    this.globalIndex = 0;

    this.searchTerm = ""

    this.searchRegions = {}

    this.listenTo(Actions.searchInMessages, this._searchInMessages)
    this.listenTo(Actions.nextSearchResult, this._nextSearchResult)
    this.listenTo(Actions.previousSearchResult, this._previousSearchResult)
  }

  /**
   * When components mount
   *
   */
  _nextSearchResult = () => {
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
    this._moveGlobalIndexBy(-1)
  }

  _recalculateMatchNodes = _.debounce(() => {
    this.matchNodes = []
    _.each(this.searchRegions, (node) => {
      let refNode;
      let topOffset = 0;
      let leftOffset = 0;
      if (node.nodeName === "IFRAME") {
        const iframeRect = node.getBoundingClientRect();
        topOffset = iframeRect.top
        leftOffset = iframeRect.left
        refNode = node.contentDocument
      } else {
        refNode = node
      }
      const matches = refNode.querySelectorAll('search-match, .search-match');
      for (let i = 0; i < matches.length; i++) {
        const rect = matches[i].getBoundingClientRect()
        this.matchNodes.push({
          node: matches[i],
          top: rect.top + topOffset,
          left: rect.left + leftOffset,
        });
      }
    });
    this.matchNodes.sort((nodeA, nodeB) => {
      const aScore = nodeA.top + nodeA.left / 1000
      const bScore = nodeB.top + nodeB.left / 1000
      return aScore - bScore
    });

    this.matchCount = this.matchNodes.length;
    this.globalIndex = Math.max(this.matchCount - 1, this.globalIndex);
    this.matchNode = this.matchNodes[this.globalIndex]
    this.trigger()
  }, 50);

  getRenderIndexForCurrentMatch(regionId) {
    if (regionId && this.matchNode.node.getAttribute('data-region-id') === regionId) {
      return this.matchNode.node.getAttribute('data-render-index')
    }
    return null
  }

  _moveGlobalIndexBy(amount) {
    if (this.matchCount === 0) {
      this.globalIndex = 0;
    } else {
      this.globalIndex += amount;
      if (this.globalIndex < 0) {
        this.globalIndex += this.matchCount
      } else {
        this.globalIndex = this.globalIndex % this.matchCount
      }
    }
    this.matchNode = this.matchNodes[this.globalIndex]
    this.trigger()
  }

  _searchInMessages = (search) => {
    if (search !== this.searchTerm) {
      this.searchTerm = search;
      this._recalculateMatchNodes()
    }
  }

  // getSearchTermAndIndex(regionId) {
  //   const searchTerm = this.searchTerm;
  //   let localIndex = -1;
  //   let matchCount = 0;
  //   if (this.searchRegions.length === 0) {
  //     return {searchTerm, localIndex: null}
  //   }
  //   for (const searchRegion of this.searchRegions) {
  //     if (this.globalIndex <= matchCount) {
  //       localIndex = matchCount - this.globalIndex
  //       return {searchTerm, localIndex}
  //     }
  //     matchCount += searchRegion.numMatches
  //   }
  //   this.searchRegions[this.searchRegions.length - 1]
  //   return {searchTerm, localIndex}
  // }

  registerSearchRegion(regionId, domNode) {
    this.searchRegions[regionId] = domNode
    this._recalculateMatchNodes()
  }

  unregisterSearchRegion(regionId) {
    delete this.searchRegions[regionId]
    this._recalculateMatchNodes()
  }
}
export default new SearchableComponentStore()
