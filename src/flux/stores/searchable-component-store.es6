import NylasStore from 'nylas-store'
import Actions from '../actions'

class SearchableComponentStore extends NylasStore {
  constructor() {
    super()
    this.searchTerm = ""
    this.listenTo(Actions.searchInMessages, this._searchInMessages)
  }

  _searchInMessages = (search) => {
    this.searchTerm = search;
    this.trigger()
  }

  getSearchTerm() {
    return this.searchTerm
  }
  //
  // registerSearchRegion(id) {
  //   this.searchTerms[id] = ""
  // }
  //
  // unregisterSearchRegion(id) {
  //   delete this.searchTerms[id]
  // }
}
export default new SearchableComponentStore()
