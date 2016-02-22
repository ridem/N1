import RealDOMParser from './real-dom-parser'

export default class IFrameSearcher {
  /**
   * An imperative renderer for iframes
   */
  static highlightSearchInDocument(searchTerm, doc) {
    const parser = new RealDOMParser()
    if (parser.matchesSearch(doc, searchTerm)) {
      parser.removeMatchesAndNormalize(doc)
      const matchNodeMap = parser.getElementsWithNewMatchNodes(doc, searchTerm)
      parser.highlightSearch(doc, matchNodeMap)
    }
  }
}
