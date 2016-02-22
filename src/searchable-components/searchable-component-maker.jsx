import _ from 'underscore'
import VirtualDOMParser from './virtual-dom-parser'
import SearchableComponentStore from './flux/stores/searchable-component-store'

class SearchableComponent {
  componentDidMount(superMethod, ...args) {
    if (superMethod) superMethod.apply(this, args);
    this._searchableListener = SearchableComponentStore.listen(() => {this._onSearchableComponentStoreChange()})
  }

  _onSearchableComponentStoreChange() {
    this.setState({
      __searchTerm: SearchableComponentStore.getSearchTerm(),
    })
  }

  componentWillUnmount(superMethod, ...args) {
    if (superMethod) superMethod.apply(this, args);
    this._searchableListener()
  }

  componentDidUpdate(superMethod, ...args) {
    if (superMethod) superMethod.apply(this, args);
  }

  render(superMethod, ...args) {
    if (superMethod) {
      const vDOM = superMethod.apply(this, args);
      const parser = new VirtualDOMParser();
      const searchTerm = this.state.__searchTerm
      if (parser.matchesSearch(vDOM, searchTerm)) {
        const normalizedDOM = parser.removeMatchesAndNormalize(vDOM)
        const matchNodeMap = parser.getElementsWithNewMatchNodes(normalizedDOM, searchTerm);
        return parser.highlightSearch(normalizedDOM, matchNodeMap)
      }
      return vDOM
    }
  }

  // _isSearchElement(element) {
  //   return element.type === SearchMatch
  // }

  // _searchRE() {
  //   const searchTerm = this.state.__searchTerm || "";
  //   let re;
  //   if (/^\/.+\/$/.test(searchTerm)) {
  //     // Looks like regex
  //     re = new RegExp(searchTerm.slice(1, searchTerm.length - 1), 'gi');
  //   } else {
  //     re = new RegExp(Utils.escapeRegExp(searchTerm), "ig");
  //   }
  //   return re
  // }

  // _matchesSearch(vDOM) {
  //   if ((this.state.__searchTerm || "").length === 0) {
  //     return false
  //   }
  //   const fullStrings = this._buildNormalizedText(vDOM)
  //   // For each match, we return an array of new elements.
  //   for (const fullString of fullStrings) {
  //     const matches = this._matchesFromFullString(fullString);
  //     if (matches.length > 0) {
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  /**
   * takes an element
   * fixes the children
   * returns the updated, cloned element
   *
   * keep walking, concatenating strings until we find a 'stop node'.
   * Search that string.
   * If we find a match, find the nodes that contain that match.
   * split the first node at the start index
   * split the second node at the end index
   *
   * "world hello world hello world"
   *
   * to:
   *
   * [
   *   "world "
   *   match
   *    "hello"
   *   " world "
   *   match
   *    "hello"
   *   " world"
   * ]
   *
   * keep walking until we find a <match> node.
   * Grab children and concatenate with siblings if they're text
   *
   * searchTerm: 'hell'
   *
   * 1. Start
   * div
   *   match
   *     "hel"
   *   "lo"
   *
   * 2. Undo match nodes
   * div
   *   "hel"
   *   "lo"
   *
   * 3. Noramlize
   * div
   *   "hello"
   *
   * 4. Find new match
   * div
   *   match
   *     "hell"
   *   "o"
   *
   * match: "hello"
   *
   * div
   *  div
   *  span
   *    br
   *    "hello world"
   *    "hel"
   *    strong
   *      em
   *        "lo"
   *    " world h"
   *  "el"
   *  "lo hel"
   *  hr
   *  "lo"
   *  div
   *    "hello "
   *    match
   *      "match"
   *    span
   *      " world"
   *
   * TO:
   *
   * div
   *  div
   *  span
   *    br
   *    "hello worldhe"
   *    strong
   *      em
   *        "llo"
   *    " world h"
   *  "el"
   *  "lo hel"
   *  hr
   *  "lo"
   *  div
   *    "hello "
   *    match
   *      "match"
   *    span
   *      " world"
   *
   * div
   *  div
   *  span
   *    br
   *    match
   *      "hello"
   *    "world"
   *    match
   *      "he"
   *    strong
   *      em
   *        match
   *          "llo"
   *    " world"
   *  match
   *    "hello"
   *  " hel"
   *  hr
   *  "lo"
   *  div
   *    match
   *      "hello"
   *    " "
   *    "match"
   *    span
   *      " world"
   */
  // _removeMatchesAndNormalize(element) {
  //   let newChildren = [];
  //   let strAccumulator = [];
  //
  //   const resetAccumulator = () => {
  //     if (strAccumulator.length > 0) {
  //       newChildren.push(strAccumulator.join(''));
  //       strAccumulator = [];
  //     }
  //   }
  //
  //   if (React.isValidElement(element) || _.isArray(element)) {
  //     let children;
  //
  //     if (_.isArray(element)) {
  //       children = element;
  //     } else {
  //       children = element.props.children;
  //     }
  //
  //     if (!children) {
  //       newChildren = null
  //     } else if (React.isValidElement(children)) {
  //       newChildren = children
  //     } else if (typeof children === "string") {
  //       strAccumulator.push(children)
  //     } else if (children.length > 0) {
  //       for (let i = 0; i < children.length; i++) {
  //         const child = children[i];
  //         if (typeof child === "string") {
  //           strAccumulator.push(child)
  //         } else if (this._isSearchElement(child)) {
  //           resetAccumulator();
  //           newChildren.push(child.props.children);
  //         } else {
  //           resetAccumulator();
  //           newChildren.push(this._removeMatchesAndNormalize(child));
  //         }
  //       }
  //     } else {
  //       newChildren = children
  //     }
  //
  //     resetAccumulator();
  //
  //     if (_.isArray(element)) {
  //       return [newChildren];
  //     }
  //     return React.cloneElement(element, {}, newChildren)
  //   }
  //   return element;
  // }

  /**
   * This looks through the virtual DOM and returns a hash of nodes that
   * have updated children due to found matches.
   *
   * The hash is keyed by the `key` of the parentElement. The value is a
   * compound object that contains the new children.
   *
   * Since contiguous blocks of text can be split across multiple nodes,
   * we need to traverse the tree to concatenate strings together first.
   * Then we can test to see if any of them and build a list of the
   * nodes that we'll need to wrap.
   *
   * Unfortunately, since the nodes are plain text, and not all strings
   * of the same set of characters are matches (since it may be a
   * fragment of a match), we need to store the parent and childOffset
   * of the textnode so we can find it again when we're updating the
   * virtual dom.
   */
  // _getElementsWithNewMatchNodes(rootNode) {
  //   const fullStrings = this._buildNormalizedText(rootNode)
  //
  //   const modifiedElements = new Map()
  //   // For each match, we return an array of new elements.
  //   for (const fullString of fullStrings) {
  //     const matches = this._matchesFromFullString(fullString);
  //
  //     if (matches.length === 0) {
  //       continue;
  //     }
  //
  //     for (const textElement of fullString) {
  //       const slicePoints = this._slicePointsForMatches(textElement,
  //           matches);
  //       if (slicePoints.length > 0) {
  //         const newChildren = this._slicedTextElement(textElement,
  //             slicePoints);
  //
  //         textElement.newChildren = newChildren;
  //         modifiedElements.set(textElement.parentNode, textElement)
  //       }
  //     }
  //   }
  //
  //   return modifiedElements;
  // }

  /**
   * Traverses a virtual DOM heirarchy and attempts to find and group
   * its text nodes
   *
   * Returns an array of bundled textNodeDescriptors. Each item in the
   * array is one contiguous block of text. This is necessary since
   * contiguous text may be split across multiple nodes and burried in
   * inline nodes (like strong, tags).
   */
  // _buildNormalizedText(rootNode) {
  //   const walker = VirtualDOMUtils.walk(rootNode);
  //
  //   const fullStrings = [];
  //   let textElementAccumulator = [];
  //   let stringIndex = 0;
  //
  //   for (const {element, parentNode, childOffset} of walker) {
  //     if (typeof element === "string") {
  //       textElementAccumulator.push({
  //         text: element,
  //         parentNode: parentNode,
  //         childOffset: childOffset,
  //         fullStringIndex: stringIndex,
  //       });
  //       stringIndex += element.length;
  //     } else if (this._looksLikeBlockElement(element)) {
  //       if (textElementAccumulator.length > 0) {
  //         fullStrings.push(textElementAccumulator);
  //         textElementAccumulator = [];
  //         stringIndex = 0;
  //       }
  //     }
  //     // else continue for inline elements
  //   }
  //   return fullStrings
  // }

  // _looksLikeBlockElement(element) {
  //   if (!element) { return false; }
  //   const blockTypes = ["br", "p", "blockquote", "div", "table", "iframe"]
  //   if (_.isFunction(element.type)) {
  //     return true
  //   } else if (blockTypes.indexOf(element.type) >= 0) {
  //     return true
  //   }
  //   return false
  // }

  /**
   * The matches are against the full string. The match indicies may
   * be completely contained within a string part, or may span
   * multiple string parts or may span part of a string part.
   *
   * We need to return a set of new children for our transformer to
   * rewrite into a new vDOM tree. We also need to store references to
   * the parent and child offset so we know which node needs the given
   * children. This is because we're dealing with plain strings, and
   * we don't want to re-rewrite all strings with the same set of
   * characters.
   *
   * "foo hello hello hello world"
   * matchStart = 4, 10, 16
   * matchEnd = 9, 15, 21
   *
   * "foo hello hel"
   * textElStart = 0
   * textElEnd = 13
   * "foo "<mark>'hello'</mark>" "<mark>'hel'</mark>
   *
   * "lo hello world"
   * textElStart = 13
   * textElEnd = 27
   * "lo hello world hel"
   */
  // _matchesFromFullString(fullString) {
  //   const re = this._searchRE();
  //   const rawString = _.pluck(fullString, "text").join('');
  //   const matches = []
  //   let match = re.exec(rawString);
  //   while (match) {
  //     const matchStart = match.index;
  //     const matchEnd = match.index + match[0].length;
  //     matches.push([matchStart, matchEnd])
  //     match = re.exec(rawString)
  //   }
  //   return matches;
  // }

  // _slicePointsForMatches(textElement, matches) {
  //   const text = textElement.text
  //   const textElStart = textElement.fullStringIndex;
  //   const textElEnd = textElement.fullStringIndex + text.length;
  //
  //   const slicePoints = [];
  //
  //   for (const [matchStart, matchEnd] of matches) {
  //     if (matchStart < textElStart && matchEnd >= textElEnd) {
  //       // textEl is completely inside of match
  //       slicePoints.push([0, text.length])
  //     } else if (matchStart >= textElStart && matchEnd < textElEnd) {
  //       // match is completely inside of textEl
  //       slicePoints.push([matchStart - textElStart, matchEnd - textElStart])
  //     } else if (matchEnd >= textElStart && matchEnd < textElEnd) {
  //       // match started in a previous el but ends in this one
  //       slicePoints.push([0, matchEnd - textElStart])
  //     } else if (matchStart >= textElStart && matchStart < textElEnd) {
  //       // match starts in this el but ends in a future one
  //       slicePoints.push([matchStart - textElStart, text.length])
  //     } else {
  //       // match is not in this element
  //       continue;
  //     }
  //   }
  //   return slicePoints;
  // }

  // _slicedTextElement(textElement, slicePoints) {
  //   const text = textElement.text;
  //   const slices = [];
  //   let sliceOffset = 0;
  //   let remainingText = text;
  //   for (let [sliceStart, sliceEnd] of slicePoints) {
  //     sliceStart = sliceStart + sliceOffset;
  //     sliceEnd = sliceEnd + sliceOffset;
  //     const before = remainingText.slice(0, sliceStart);
  //     if (before.length > 0) {
  //       slices.push(before)
  //     }
  //
  //     const matchText = remainingText.slice(sliceStart, sliceEnd);
  //     if (matchText.length > 0) {
  //       slices.push(React.createElement(SearchMatch,
  //             {}, matchText));
  //     }
  //
  //     remainingText = remainingText.slice(sliceEnd, remainingText.length)
  //     sliceOffset += sliceEnd
  //   }
  //   slices.push(remainingText);
  //   return slices;
  // }

  // _highlightSearch(element, matchNodeMap) {
  //   if (React.isValidElement(element) || _.isArray(element)) {
  //     let newChildren = []
  //     let children;
  //
  //     if (_.isArray(element)) {
  //       children = element;
  //     } else {
  //       children = element.props.children;
  //     }
  //
  //     const matchNode = matchNodeMap.get(element);
  //
  //     if (!children) {
  //       newChildren = null
  //     } else if (React.isValidElement(children)) {
  //       if (matchNode && matchNode.childOffset === 0) {
  //         newChildren = matchNode.newChildren
  //       } else {
  //         newChildren = this._highlightSearch(children, matchNodeMap)
  //       }
  //     } else if (!_.isString(children) && children.length > 0) {
  //       for (let i = 0; i < children.length; i++) {
  //         const child = children[i];
  //         if (matchNode && matchNode.childOffset === i) {
  //           newChildren.push(matchNode.newChildren)
  //         } else {
  //           newChildren.push(this._highlightSearch(child, matchNodeMap))
  //         }
  //       }
  //     } else {
  //       if (matchNode && matchNode.childOffset === 0) {
  //         newChildren = matchNode.newChildren
  //       } else {
  //         newChildren = children
  //       }
  //     }
  //
  //     if (_.isArray(element)) {
  //       return [newChildren];
  //     }
  //     return React.cloneElement(element, {}, newChildren)
  //   }
  //   return element;
  // }

  // cloneAndModify(superMethod, element) {
  //   // if (element && element.constructor.name === "String") {
  //   //   // return React.cloneElement(element, [], "TEST")
  //   //   return element
  //   if (React.isValidElement(element)) {
  //     const children = React.Children.map(element.props.children, (child) => {
  //       this.cloneAndModify(child)
  //     });
  //     return React.cloneElement(element, [], children)
  //     // element.props.children = children
  //     // return element
  //   }
  //   return element
  //
  //   // return React.Children.map(children, (child) => {
  //   //   return child;
  //   //   // if (React.isValidElement(child)) {
  //   //   //   const newChildren = this.cloneAndModify(null, child.props.children);
  //   //   //   return React.cloneElement(child, {}, newChildren)
  //   //   // } else if (child.constructor.name === "String") {
  //   //   //   return "TEST"
  //   //   // }
  //   //   // return child
  //   // });
  // }
}

// React.Children.forEach does not behave as you'd expect. When it gets
// to leaf nodes, the callback gets passed the leaf node istelf instead
// of `null` or a `string` in the case of a text node. As a result we
// have to manually traverse the React vDOM without the React.Children
// helper methods :(
// React.Children.map = (test, fn) => {
// }

/**
 * Takes a React component and makes it searchable
 */
export default class SearchableComponentMaker {
  static extend(component) {
    const proto = SearchableComponent.prototype;
    for (const propName of Object.getOwnPropertyNames(proto)) {
      const origMethod = component.prototype[propName]
      if (origMethod) {
        if (propName === "constructor") { continue }
        component.prototype[propName] = _.partial(proto[propName], origMethod)
      } else {
        component.prototype[propName] = proto[propName]
      }
    }
    return component
  }

  static searchInIframe(contentDocument) {
    return contentDocument;
  }
}

