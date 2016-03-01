import _ from 'underscore'
import DOMUtils from '../../dom-utils'
import NylasStore from 'nylas-store'
import Actions from '../actions'

class SearchableComponentStore extends NylasStore {
  constructor() {
    super();
    this.matchNode = null
    this.matchNodes = []
    this.matchCount = 0;
    this.globalIndex = null; // null means nothing is selected
    this.scrollAncestor = null;

    this.searchTerm = ""

    this.searchRegions = {}

    this.listenTo(Actions.searchInMessages, this._searchInMessages)
    this.listenTo(Actions.nextSearchResult, this._nextSearchResult)
    this.listenTo(Actions.previousSearchResult, this._previousSearchResult)
  }

  _nextSearchResult = () => {
    this._moveGlobalIndexBy(1);
  }

  _previousSearchResult = () => {
    this._moveGlobalIndexBy(-1);
  }

  // This needs to be debounced since it's called when all of our
  // components are mounting and unmounting. It also is very expensive
  // since it calls `getBoundingClientRect` and will trigger repaints.
  _recalculateMatchNodes = _.debounce(() => {
    this.matchNodes = []

    // searchNodes need to all be under the root document. matchNodes
    // may contain nodes inside of iframes which are not attached ot the
    // root document.
    const searchNodes = []

    _.each(this.searchRegions, (node) => {
      let refNode;
      let topOffset = 0;
      let leftOffset = 0;
      if (node.nodeName === "IFRAME") {
        searchNodes.push(node)
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
        if (!DOMUtils.nodeIsLikelyVisible(matches[i])) {
          continue;
        }
        const rect = matches[i].getBoundingClientRect();
        if (node.nodeName !== "IFRAME") {
          searchNodes.push(matches[i])
        }
        this.matchNodes.push({
          node: matches[i],
          top: rect.top + topOffset,
          left: rect.left + leftOffset,
          height: rect.height,
          bottom: rect.top + topOffset + rect.height,
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

    const parentFilter = (node) => {
      return _.contains(node.classList, "scroll-region-content")
    }
    this.scrollAncestor = DOMUtils.commonAncestor(searchNodes, parentFilter)

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
    this._scrollIntoView()
    this.trigger()
  }

  _scrollIntoView() {
    if (!this.matchNode || !this.matchNode.node || !this.scrollAncestor) {
      return
    }

    const scrollRect = this.scrollAncestor.getBoundingClientRect()

    if (this.matchNode.top < scrollRect.top || this.matchNode.bottom > scrollRect.bottom) {
      const wrapMid = scrollRect.top + scrollRect.height / 2
      const elMid = this.matchNode.top + this.matchNode.height / 2
      const delta = elMid - wrapMid
      this.scrollAncestor.scrollTop = this.scrollAncestor.scrollTop + delta
    }
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
