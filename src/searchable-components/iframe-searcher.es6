import RealDOMParser from './real-dom-parser'

export default class IFrameSearcher {
  /**
   * An imperative renderer for iframes
   */
  static highlightSearchInDocument(searchTerm, doc, renderIndexForCurrentMatch) {
    const parser = new RealDOMParser()
    if (parser.matchesSearch(doc, searchTerm)) {
      parser.removeMatchesAndNormalize(doc)
      const matchNodeMap = parser.getElementsWithNewMatchNodes(doc, searchTerm, renderIndexForCurrentMatch)
      parser.highlightSearch(doc, matchNodeMap)
    } else {
      parser.removeMatchesAndNormalize(doc)
    }
  }
}
