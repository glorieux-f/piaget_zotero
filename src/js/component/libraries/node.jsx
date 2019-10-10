'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Icon from '../ui/icon';
import { DragSource, DropTarget } from 'react-dnd-cjs';
import { noop } from '../../utils';
import { ITEM, COLLECTION } from '../../constants/dnd';
import { pick } from '../../common/immutable';
import { isTriggerEvent } from '../../common/event';

const dndSpec = {
	drop(props, monitor) {
		if(monitor.isOver({ shallow: true })) {
			const { dndTarget } = props;
			return dndTarget;
		}
	},
	canDrop({ dndTarget = {} }, monitor) {
		if(monitor.getItemType() === ITEM) {
			const { libraryKey: sourceLibraryKey } = monitor.getItem();
			if(dndTarget.targetType === 'library' && dndTarget.libraryKey !== sourceLibraryKey) {
				return true;
			}
			if(dndTarget.targetType === 'collection') {
				return true;
			}
		} else if(monitor.getItemType() === COLLECTION) {
			const {
				collectionKey: srcCollectionKey,
				libraryKey: srcLibraryKey
			} = monitor.getItem();
			const {
				targetType,
				collectionKey: targetCollectionKey,
				libraryKey: targetLibraryKey
			} = dndTarget;

			if(!['collection', 'library'].includes(targetType)) {
				return false;
			}
			return srcLibraryKey === targetLibraryKey && srcCollectionKey !== targetCollectionKey;
		}
	}
}

const dndCollect = (connect, monitor) => ({
	connectDropTarget: connect.dropTarget(),
	isOver: monitor.isOver({ shallow: true }),
	canDrop: monitor.canDrop(),
});

const dndCollectionDragSpec = {
	beginDrag: (props) => {
		return props.dndTarget;
	},
	canDrag: ({ shouldBeDraggable }) => shouldBeDraggable,
	endDrag: ({ dndTarget, onDrag }, monitor) => {
		const src = dndTarget;
		const target = monitor.getDropResult();
		if(target) {
			onDrag(src, target);
		}
	}
};

const dndCollectionDragCollect = (connect, monitor) => ({
	connectDragSource: connect.dragSource(),
	isDragging: monitor.isDragging(),
});

class Node extends React.PureComponent {
	state = {};

	handleTwistyClick = ev => {
		ev && ev.stopPropagation();
		this.props.onOpen(ev);
	}

	handleMouseLeave = () => {
		clearTimeout(this.ongoingLongPress);
	}

	handleMouseUp = () => {
		if(this.isLongPress && !this.isLongPressCompleted) {
			clearTimeout(this.ongoingLongPress);
			this.isLongPressCompleted = false;
		}
	}

	handleMouseClick = ev => {
		if(!this.isLongPress || !this.isLongPressCompleted) {
			this.props.onClick(ev);
		}
		this.isLongPress = false;
		this.isLongPressCompleted = false;
	}

	handleMouseDown = ev => {
		if(!this.props.onRename) {
			this.isLongPress = false;
			return;
		}

		this.isLongPress = true;
		this.isLongPressCompleted = false;
		ev.persist();
		this.ongoingLongPress = setTimeout(() => {
			const { isDragging } = this.props;
			this.isLongPressCompleted = true;
			ev.preventDefault();
			if(!isDragging) {
				this.props.onRename(ev);
			}
		}, 500);
	}

	handleKeyDown = ev => {
		const { hideTwisty, onFocusNext, onOpen, onFocusPrev, isOpen,
			onDrillDownNext, onDrillDownPrev } = this.props;

		if(ev.key === "ArrowLeft") {
			ev.target === ev.currentTarget ? onOpen(ev, false) : onDrillDownPrev(ev);
		} else if(ev.key === "ArrowRight") {
			isOpen || hideTwisty ? onDrillDownNext(ev) : onOpen(ev, true);
		} else if(ev.key === "ArrowDown") {
			ev.target === ev.currentTarget && onFocusNext(ev);
		} else if(ev.key === "ArrowUp") {
			ev.target === ev.currentTarget && onFocusPrev(ev);
		} else if(isTriggerEvent(ev)) {
			ev.target === ev.currentTarget && ev.target.click();
		}
		this.props.onKeyDown(ev);
	}

	handleFocus = ev => {
		if(ev.target === ev.currentTarget) {
			this.setState({ isFocused: true });
		}
	}

	handleBlur = ev => {
		if(ev.target === ev.currentTarget) {
			this.setState({ isFocused: false });
		}
	}

	render() {
		const { canDrop, children, className, connectDragSource,
			connectDropTarget, showTwisty, isOpen, isOver, subtree, } = this.props;
		const { isFocused } = this.state;

		const twistyButton = (
			<button
				className="twisty"
				onClick={ this.handleTwistyClick }
				tabIndex={ -1 }
				type="button"
			>
				<Icon type={ '16/triangle' } width="16" height="16" />
			</button>
		);

		const isActive = canDrop && isOver;

		return connectDragSource(connectDropTarget(
			<li
				className={ cx(className, { focus: isFocused }) }
				>
				<div
					{ ...pick(this.props, propName => propName.startsWith('data-') || ['tabIndex'].includes(propName)) }
					className={ cx('item-container', { 'dnd-target': isActive }) }
					role="treeitem"
					aria-expanded={ isOpen }
					onMouseDown={ this.handleMouseDown }
					onMouseUp={ this.handleMouseUp }
					onMouseLeave={ this.handleMouseLeave }
					onClick={ this.handleMouseClick }
					onFocus={ this.handleFocus }
					onBlur={ this.handleBlur }
					onKeyDown={ this.handleKeyDown }
				>
					{ subtree || showTwisty ? twistyButton : null }
					{ children }
				</div>
				{ subtree }
			</li>
		));
	}

	static propTypes = {
		canDrop: PropTypes.bool,
		children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
		className: PropTypes.string,
		connectDragSource: PropTypes.func,
		connectDropTarget: PropTypes.func,
		isDragging: PropTypes.bool,
		isOpen: PropTypes.bool,
		isOver: PropTypes.bool,
		onClick: PropTypes.func,
		onDrag: PropTypes.func,
		onDrillDownNext: PropTypes.func,
		onDrillDownPrev: PropTypes.func,
		onFocusNext: PropTypes.func,
		onFocusPrev: PropTypes.func,
		onKeyDown: PropTypes.func,
		onOpen: PropTypes.func,
		onRename: PropTypes.func,
		showTwisty: PropTypes.bool,
		subtree: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
	}

	static defaultProps = {
		onClick: noop,
		onDrillDownNext: noop,
		onDrillDownPrev: noop,
		onFocusNext: noop,
		onFocusPrev: noop,
		onKeyDown: noop,
		onOpen: noop,
	}
}

export default DragSource(COLLECTION, dndCollectionDragSpec, dndCollectionDragCollect)(
	DropTarget([COLLECTION, ITEM], dndSpec, dndCollect)(Node)
);
