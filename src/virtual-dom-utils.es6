import _ from 'underscore'
import React from 'react'

const noop = (element) => {return element}

class VirtualTreeWalker {
  constructor(root, filter) {
    this.root = root;
    this.filter = filter;
    this.currentNode = this.root;
  }

}

const VirtualDOMUtils = {

  *walk(element) {
    yield element;
    if (React.isValidElement(element)) {
      const children = element.props.children;
      if (!children) {
        return
      } else if (children.constructor.name === "String") {
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

  /**
   * Clones the element
   */
  transform(element, transformer = noop) {
    if (React.isValidElement(element)) {
      const newChildren = []
      const children = element.props.children;
      if (children && children.length > 0) {
        for (let i = 0; i < element.props.children.length; i++) {
          child = children[i]
        }
      }
      return React.cloneElement(element, newProps, ...newChildren)
    }
    return element;
  },
}
export default VirtualDOMUtils
