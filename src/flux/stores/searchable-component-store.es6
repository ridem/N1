import _ from 'underscore'
import NylasStore from 'nylas-store'
import Actions from '../actions'

class SearchableComponentStore extends NylasStore {
  constructor() {
    super();
    this.matchNode = null
    this.matchNodes = []
    this.matchCount = 0;
    this.globalIndex = null; // null means nothing is selected

    this.searchTerm = ""

    this.searchRegions = {}

    this.listenTo(Actions.searchInMessages, this._searchInMessages)
    this.listenTo(Actions.nextSearchResult, this._nextSearchResult)
    this.listenTo(Actions.previousSearchResult, this._previousSearchResult)
  }

  _nextSearchResult = () => {
    this._moveGlobalIndexBy(1)
  }

  _previousSearchResult = () => {
    this._moveGlobalIndexBy(-1)
  }

  // This needs to be debounced since it's called when all of our
  // components are mounting and unmounting. It also is very expensive
  // since it calls `getBoundingClientRect` and will trigger repaints.
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
        refNode = node.contentDocument.body
        if (!refNode) { refNode = node.contentDocument; }
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

    if (this.globalIndex !== null) {
      this.globalIndex = Math.min(this.matchCount - 1, this.globalIndex);
      this.matchNode = this.matchNodes[this.globalIndex]
    }

    this.trigger()
  }, 100);

  /**
   * The searchIndex
   */
  getSearchTermAndIndex(regionId) {
    let searchIndex = null;
    if (regionId && this.matchNode && this.matchNode.node.getAttribute('data-region-id') === regionId) {
      searchIndex = +this.matchNode.node.getAttribute('data-render-index')
    }
    return {searchTerm: this.searchTerm, searchIndex}
  }

  _moveGlobalIndexBy(amount) {
    if (this.matchCount === 0) {
      return
    }
    if (this.globalIndex === null) {
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
