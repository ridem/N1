import _ from 'underscore'
import React from 'react'

const VirtualDOMUtils = {
  some(rootElement, testFn) {
    for (const element of VirtualDOMUtils.walk(rootElement)) {
      if (testFn(element)) {
        return true;
      }
    }
    return false;
  },


  /**
   * Returns the update path to nodes matching a given function.
   * https://facebook.github.io/react/docs/update.html
   */
  updateTree(elementsToUpdate=[]) {
    // for (element of elementsToUpdate) {
    //   // Fix the element, then traverse up the tree re-cloning parents.
    // }
  }

  /**
   * Clones the element
   */
  transform(element, transformer = (el)=>el) {
    let newProps = {}
    let newChildren = []
    newChildren = element.props.children
    const newEl = React.cloneElement(element, newProps, newChildren);
  },

  *walk(element) {
    yield element;
    if (React.isValidElement(element)) {
      const children = element.props.children;
      if (!children) {
        return
      } else if (_.isString(children)) {
        yield children
      } else if (children.length > 0) {
        for (let i = 0; i < children.length; i++) {
          yield *this.walk(children[i])
        }
      } else {
        yield *this.walk(children)
      }
    } else if (_.isArray(element)) {
      for (let i = 0; i < element.length; i++) {
        yield *this.walk(element[i])
      }
    }
    return
  },
}
export default VirtualDOMUtils
