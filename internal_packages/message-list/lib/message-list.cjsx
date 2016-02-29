_ = require 'underscore'
React = require 'react'
classNames = require 'classnames'
MessageItemContainer = require './message-item-container'

{Utils,
 Actions,
 Message,
 DraftStore,
 MessageStore,
 AccountStore,
 DatabaseStore,
 WorkspaceStore,
 ChangeLabelsTask,
 ComponentRegistry,
 ChangeStarredTask,
 SearchableComponentMaker} = require("nylas-exports")

{Spinner,
 RetinaImg,
 MailLabel,
 ScrollRegion,
 MailImportantIcon,
 InjectedComponent,
 KeyCommandsRegion,
 InjectedComponentSet} = require('nylas-component-kit')

class MessageListScrollTooltip extends React.Component
  @displayName: 'MessageListScrollTooltip'
  @propTypes:
    viewportCenter: React.PropTypes.number.isRequired
    totalHeight: React.PropTypes.number.isRequired

  componentWillMount: =>
    @setupForProps(@props)

  componentWillReceiveProps: (newProps) =>
    @setupForProps(newProps)

  shouldComponentUpdate: (newProps, newState) =>
    not _.isEqual(@state,newState)

  setupForProps: (props) ->
    # Technically, we could have MessageList provide the currently visible
    # item index, but the DOM approach is simple and self-contained.
    #
    els = document.querySelectorAll('.message-item-wrap')
    idx = _.findIndex els, (el) -> el.offsetTop > props.viewportCenter
    if idx is -1
      idx = els.length

    @setState
      idx: idx
      count: els.length

  render: ->
    <div className="scroll-tooltip">
      {@state.idx} of {@state.count}
    </div>

class MessageList extends React.Component
  @displayName: 'MessageList'
  @containerRequired: false
  @containerStyles:
    minWidth: 500
    maxWidth: 999999

  constructor: (@props) ->
    @state = @_getStateFromStores()
    @state.minified = true
    @_draftScrollInProgress = false
    @MINIFY_THRESHOLD = 3

  componentDidMount: =>
    @_unsubscribers = []
    @_unsubscribers.push MessageStore.listen @_onChange

  componentWillUnmount: =>
    unsubscribe() for unsubscribe in @_unsubscribers

  shouldComponentUpdate: (nextProps, nextState) =>
    not Utils.isEqualReact(nextProps, @props) or
    not Utils.isEqualReact(nextState, @state)

  componentDidUpdate: (prevProps, prevState) =>
    return if @state.loading

    newDraftClientIds = @_newDraftClientIds(prevState)
    if newDraftClientIds.length > 0
      @_focusDraft(@_getMessageContainer(newDraftClientIds[0]))

  _keymapHandlers: ->
    'application:reply': => @_createReplyOrUpdateExistingDraft('reply')
    'application:reply-all': => @_createReplyOrUpdateExistingDraft('reply-all')
    'application:forward': => @_onForward()
    'application:print-thread': => @_onPrintThread()
    'core:messages-page-up': => @_onScrollByPage(-1)
    'core:messages-page-down': => @_onScrollByPage(1)

  _newDraftClientIds: (prevState) =>
    oldDraftIds = _.map(_.filter((prevState.messages ? []), (m) -> m.draft), (m) -> m.clientId)
    newDraftIds = _.map(_.filter((@state.messages ? []), (m) -> m.draft), (m) -> m.clientId)
    return _.difference(newDraftIds, oldDraftIds) ? []

  _getMessageContainer: (clientId) =>
    @refs["message-container-#{clientId}"]

  _focusDraft: (draftElement) =>
    # Note: We don't want the contenteditable view competing for scroll offset,
    # so we block incoming childScrollRequests while we scroll to the new draft.
    @_draftScrollInProgress = true
    draftElement.focus()
    @refs.messageWrap.scrollTo(draftElement, {
      position: ScrollRegion.ScrollPosition.Top,
      settle: true,
      done: =>
        @_draftScrollInProgress = false
    })

  _createReplyOrUpdateExistingDraft: (type) =>
    unless type in ['reply', 'reply-all']
      throw new Error("_createReplyOrUpdateExistingDraft called with #{type}, not reply or reply-all")

    last = _.last(@state.messages ? [])

    return unless @state.currentThread and last

    # If the last message on the thread is already a draft, fetch the message it's
    # in reply to and the draft session and change the participants.
    if last.draft is true
      data =
        session: DraftStore.sessionForClientId(last.clientId)
        replyToMessage: Promise.resolve(@state.messages[@state.messages.length - 2])
        type: type

      if last.replyToMessageId
        msg = _.findWhere(@state.messages, {id: last.replyToMessageId})
        if msg
          data.replyToMessage = Promise.resolve(msg)
        else
          data.replyToMessage = DatabaseStore.find(Message, last.replyToMessageId)

      Promise.props(data).then @_updateExistingDraft, (err) =>
        # This can happen if the draft was deleted and the update hadn't reached
        # our component yet, but it's very rare. This is here to silence the error.
        Promise.resolve()
    else
      if type is 'reply'
        Actions.composeReply(thread: @state.currentThread, message: last)
      else
        Actions.composeReplyAll(thread: @state.currentThread, message: last)

  _updateExistingDraft: ({type, session, replyToMessage}) =>
    return unless replyToMessage and session
    draft = session.draft()
    updated = {to: [].concat(draft.to), cc: [].concat(draft.cc)}

    replySet = replyToMessage.participantsForReply()
    replyAllSet = replyToMessage.participantsForReplyAll()

    if type is 'reply'
      targetSet = replySet

      # Remove participants present in the reply-all set and not the reply set
      for key in ['to', 'cc']
        updated[key] = _.reject updated[key], (contact) ->
          inReplySet = _.findWhere(replySet[key], {email: contact.email})
          inReplyAllSet = _.findWhere(replyAllSet[key], {email: contact.email})
          return inReplyAllSet and not inReplySet
    else
      # Add participants present in the reply-all set and not on the draft
      # Switching to reply-all shouldn't really ever remove anyone.
      targetSet = replyAllSet

    for key in ['to', 'cc']
      for contact in targetSet[key]
        updated[key].push(contact) unless _.findWhere(updated[key], {email: contact.email})

    session.changes.add(updated)
    @_focusDraft(@_getMessageContainer(draft.clientId))

  _onForward: =>
    return unless @state.currentThread
    Actions.composeForward(thread: @state.currentThread)

  render: =>
    if not @state.currentThread
      return <div className="message-list" id="message-list"></div>

    wrapClass = classNames
      "messages-wrap": true
      "ready": not @state.loading

    <KeyCommandsRegion globalHandlers={@_keymapHandlers()}>
      <div className="message-list" id="message-list">
        <ScrollRegion tabIndex="-1"
             className={wrapClass}
             scrollTooltipComponent={MessageListScrollTooltip}
             ref="messageWrap">
          {@_renderSubject()}
          <div className="headers" style={position:'relative'}>
            <InjectedComponentSet
              className="message-list-headers"
              matching={role:"MessageListHeaders"}
              exposedProps={thread: @state.currentThread}
              direction="column"/>
          </div>
          {@_messageElements()}
        </ScrollRegion>
        <Spinner visible={@state.loading} />
      </div>
    </KeyCommandsRegion>

  _renderSubject: ->
    subject = @state.currentThread.subject
    subject = "(No Subject)" if not subject or subject.length is 0

    <div className="message-subject-wrap">
      <MailImportantIcon thread={@state.currentThread}/>
      <div style={flex: 1}>
        <span className="message-subject">{subject}</span>
        {@_renderLabels()}
      </div>
      {@_renderIcons()}
    </div>

  _renderIcons: =>
    <div className="message-icons-wrap">
      {@_renderExpandToggle()}
      <div onClick={@_onPrintThread}>
        <RetinaImg name="print.png" title="Print Thread" mode={RetinaImg.Mode.ContentIsMask}/>
      </div>
    </div>

  _renderExpandToggle: =>
    if MessageStore.items().length < 2
      <span></span>
    else if MessageStore.hasCollapsedItems()
      <div onClick={@_onToggleAllMessagesExpanded}>
        <RetinaImg name={"expand.png"} title={"Expand All"} mode={RetinaImg.Mode.ContentIsMask}/>
      </div>
    else
      <div onClick={@_onToggleAllMessagesExpanded}>
        <RetinaImg name={"collapse.png"} title={"Collapse All"} mode={RetinaImg.Mode.ContentIsMask}/>
      </div>

  _renderLabels: =>
    account = AccountStore.accountForId(@state.currentThread.accountId)
    return false unless account.usesLabels()
    labels = @state.currentThread.sortedCategories()
    labels = _.reject labels, (l) -> l.name is 'important'
    labels.map (label) =>
      <MailLabel label={label} key={label.id} onRemove={ => @_onRemoveLabel(label) }/>

  _renderReplyArea: =>
    <div className="footer-reply-area-wrap" onClick={@_onClickReplyArea} key='reply-area'>
      <div className="footer-reply-area">
        <RetinaImg name="#{@_replyType()}-footer.png" mode={RetinaImg.Mode.ContentIsMask}/>
        <span className="reply-text">Write a reply…</span>
      </div>
    </div>

  # Returns either "reply" or "reply-all"
  _replyType: =>
    defaultReplyType = NylasEnv.config.get('core.sending.defaultReplyType')
    lastMsg = _.last(_.filter((@state.messages ? []), (m) -> not m.draft))
    return 'reply' unless lastMsg

    if lastMsg.canReplyAll()
      if defaultReplyType is 'reply-all'
        return 'reply-all'
      else
        return 'reply'
    else
      return 'reply'

  _onToggleAllMessagesExpanded: ->
    Actions.toggleAllMessagesExpanded()

  _onPrintThread: =>
    node = React.findDOMNode(@)
    Actions.printThread(@state.currentThread, node.innerHTML)

  _onRemoveLabel: (label) =>
    task = new ChangeLabelsTask(thread: @state.currentThread, labelsToRemove: [label])
    Actions.queueTask(task)

  _onClickReplyArea: =>
    return unless @state.currentThread
    @_createReplyOrUpdateExistingDraft(@_replyType())

  _messageElements: =>
    elements = []

    hasReplyArea = not _.last(@state.messages)?.draft
    messages = @_messagesWithMinification(@state.messages)
    messages.forEach (message, idx) =>

      if message.type is "minifiedBundle"
        elements.push(@_renderMinifiedBundle(message))
        return

      collapsed = !@state.messagesExpandedState[message.id]
      isLastMsg = (messages.length - 1 is idx)
      isBeforeReplyArea = isLastMsg and hasReplyArea

      elements.push(
        <MessageItemContainer key={idx}
                              ref={"message-container-#{message.clientId}"}
                              thread={@state.currentThread}
                              message={message}
                              collapsed={collapsed}
                              isLastMsg={isLastMsg}
                              isBeforeReplyArea={isBeforeReplyArea}
                              scrollTo={@_scrollTo} />
      )

    if hasReplyArea
      elements.push(@_renderReplyArea())

    return elements

  _renderMinifiedBundle: (bundle) ->
    BUNDLE_HEIGHT = 36
    lines = bundle.messages[0...10]
    h = Math.round(BUNDLE_HEIGHT / lines.length)

    <div className="minified-bundle"
         onClick={ => @setState minified: false }
         key={Utils.generateTempId()}>
      <div className="num-messages">{bundle.messages.length} older messages</div>
      <div className="msg-lines" style={height: h*lines.length}>
        {lines.map (msg, i) ->
          <div key={msg.id} style={height: h*2, top: -h*i} className="msg-line"></div>}
      </div>
    </div>

  _messagesWithMinification: (messages=[]) =>
    return messages unless @state.minified

    messages = _.clone(messages)
    minifyRanges = []
    consecutiveCollapsed = 0

    messages.forEach (message, idx) =>
      return if idx is 0 # Never minify the 1st message

      expandState = @state.messagesExpandedState[message.id]

      if not expandState
        consecutiveCollapsed += 1
      else
        # We add a +1 because we don't minify the last collapsed message,
        # but the MINIFY_THRESHOLD refers to the smallest N that can be in
        # the "N older messages" minified block.
        if expandState is "default"
          minifyOffset = 1
        else # if expandState is "explicit"
          minifyOffset = 0

        if consecutiveCollapsed >= @MINIFY_THRESHOLD + minifyOffset
          minifyRanges.push
            start: idx - consecutiveCollapsed
            length: (consecutiveCollapsed - minifyOffset)
        consecutiveCollapsed = 0

    indexOffset = 0
    for range in minifyRanges
      start = range.start - indexOffset
      minified =
        type: "minifiedBundle"
        messages: messages[start...(start+range.length)]
      messages.splice(start, range.length, minified)

      # While we removed `range.length` items, we also added 1 back in.
      indexOffset += (range.length - 1)

    return messages

  # Some child components (like the composer) might request that we scroll
  # to a given location. If `selectionTop` is defined that means we should
  # scroll to that absolute position.
  #
  # If messageId and location are defined, that means we want to scroll
  # smoothly to the top of a particular message.
  _scrollTo: ({clientId, rect, position}={}) =>
    return if @_draftScrollInProgress
    if clientId
      messageElement = @_getMessageContainer(clientId)
      return unless messageElement
      pos = position ? ScrollRegion.ScrollPosition.Visible
      @refs.messageWrap.scrollTo(messageElement, {
        position: pos
      })
    else if rect
      @refs.messageWrap.scrollToRect(rect, {
        position: ScrollRegion.ScrollPosition.CenterIfInvisible
      })
    else
      throw new Error("onChildScrollRequest: expected clientId or rect")

  _onScrollByPage: (direction) =>
    height = React.findDOMNode(@refs.messageWrap).clientHeight
    @refs.messageWrap.scrollTop += height * direction

  _onChange: =>
    newState = @_getStateFromStores()
    if @state.currentThread?.id isnt newState.currentThread?.id
      newState.minified = true
    @setState(newState)

  _getStateFromStores: =>
    messages: (MessageStore.items() ? [])
    messagesExpandedState: MessageStore.itemsExpandedState()
    currentThread: MessageStore.thread()
    loading: MessageStore.itemsLoading()

module.exports = SearchableComponentMaker.extend(MessageList)
