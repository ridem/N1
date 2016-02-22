import _ from 'underscore'
import UnifiedDOMParser from './unified-dom-parser'
import {DOMUtils} from 'nylas-exports'

export default class RealDOMParser extends UnifiedDOMParser {
  *_genDOMWalker(treeWalker) {
    let node = treeWalker.nextNode();
    while (node) {
      yield node;
      node = treeWalker.nextNode();
    }
    return
  }

  getWalker(dom, filter) {
    const treeWalker = document.createTreeWalker(dom, filter);
    return this._genDOMWalker(treeWalker);
  }

  isTextNode(node) {
    return node.nodeType === Node.TEXT_NODE
  }

  textNodeLength(textNode) {
    return (textNode.data || "").length
  }

  textNodeContents(textNode) {
    return (textNode.data)
  }

  looksLikeBlockElement(node) {
    return DOMUtils.looksLikeBlockElement(node)
  }

  getRawFullString(fullString) {
    return _.pluck(fullString, "data").join('');
  }

  removeMatchesAndNormalize(element) {
    const matches = element.querySelectorAll('search-match');
    if (matches.length === 0) { return null }
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      DOMUtils.unwrapNode(match)
    }
    element.normalize();
    return element
  }

  createTextNode(rawText) {
    return document.createTextNode(rawText);
  }
  createMatchNode(rawText) {
    const text = document.createTextNode(rawText);
    const newNode = document.createElement('search-match');
    newNode.appendChild(text);
    return newNode
  }
  textNodeKey(textElement) {
    return textElement;
  }

  highlightSearch(element, matchNodeMap) {
    const walker = this.getWalker(element, NodeFilter.SHOW_TEXT);
    // We have to expand the whole generator because we're mutating in
    // place
    const textNodes = [...walker]
    for (const textNode of textNodes) {
      if (matchNodeMap.has(textNode)) {
        const {originalTextNode, newTextNodes} = matchNodeMap.get(textNode);
        const frag = document.createDocumentFragment();
        for (const newNode of newTextNodes) {
          frag.appendChild(newNode);
        }
        textNode.parentNode.replaceChild(frag, originalTextNode)
      }
    }
  }
}
