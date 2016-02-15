import _ from 'underscore'
import SearchableComponentStore from './flux/stores/searchable-component-store'
/**
 * Takes a React component and makes it searchable
 */
export default class SearchableComponentMaker {
  static extend(component) {
    const searchableComponent = new SearchableComponent();
    for (const method in searchableComponent.prototype) {
      const origMethod = component.prototype[method]
      component.prototype[method] = _.partial(method, origMethod)
    }
    component.prototype
  }
}

class SearchableComponent {
  componentWillMount() {
  }

  componentWillUnmount() {

  }

  componentDidUpdate() {

  }

  render() {
  }
}
