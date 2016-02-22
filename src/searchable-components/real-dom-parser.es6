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

  getWalker(dom) {
    const treeWalker = document.createTreeWalker(dom, NodeFilter.SHOW_TEXT);
    return this._genDOMWalker(treeWalker);
  }

  isTextNode({element}) {
    return element.nodeType === Node.TEXT_NODE
  }

  textNodeLength({element}) {
    return (element.data || "").length
  }

  textNodeContents(textNode) {
    return (textNode.data)
  }

  looksLikeBlockElement({element}) {
    return DOMUtils.looksLikeBlockElement(element)
  }

  getRawFullString(fullString) {
    return _.pluck(fullString, "data").join('');
  }

  removeMatchesAndNormalize(element) {
    const matches = element.querySelectorAll('search-match');
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
    const walker = this.getWalker(element);
    for (const textNode of walker) {
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
