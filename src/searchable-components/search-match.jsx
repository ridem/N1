import React from 'react'

export default class SearchMatch extends React.Component {
  static displayName = "SearchMatch";

  render() {
    return (
      <span className="search-match">{this.props.children}</span>
    )
  }
}

