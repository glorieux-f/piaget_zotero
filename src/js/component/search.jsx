'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap/lib';
import { noop } from '../utils';
import Button from './ui/button';
import Icon from './ui/icon';
const modes = {
	titleCreatorYear: "Title, Creator, Year",
	everything: "Everything"
};

class Search extends React.PureComponent {
	state = {
		searchValue: this.props.search,
		qmode: this.props.qmode || 'titleCreatorYear'
	}

	componentDidUpdate({ itemsSource: prevItemsSource }, { qmode: prevQmode }) {
		const { itemsSource } = this.props;
		const { qmode, searchValue } = this.state;

		if(searchValue && qmode !== prevQmode) {
			this.props.onSearch(searchValue, qmode);
		}
		if(itemsSource !== prevItemsSource && itemsSource !== 'query') {
			this.setState({ searchValue: '' });
		}
	}

	handleSearchChange = ev => {
		const newValue = ev.currentTarget.value;
		this.setState({ searchValue: newValue });
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => {
			this.props.onSearch(newValue, newValue ? this.state.qmode : null);
		}, 300);
	}

	handleSearchClear = () => {
		clearTimeout(this.timeout);
		this.setState({ searchValue: '' });
		this.props.onSearch();
		this.inputRef.focus();
	}

	handleSelectMode = ev => {
		const qmode = ev.currentTarget.dataset.qmode;
		this.setState({ qmode });
	}

	handleKeyDown = ev => {
		const { onFocusNext, onFocusPrev } = this.props;
		if(ev.target !== ev.currentTarget) {
			return;
		}

		if(ev.key === 'ArrowRight') {
			onFocusNext(ev);
		} else if(ev.key === 'ArrowLeft') {
			onFocusPrev(ev);
		}
	}

	render() {
		const { autoFocus } = this.props;
		return (
			<div className="search input-group">
				<UncontrolledDropdown
					className="dropdown dropdown-wrapper"
				>
					<DropdownToggle
						color={ null }
						className="btn-icon dropdown-toggle"
						tabIndex={ -2 }
						onKeyDown={ this.handleKeyDown }
					>
						<Icon type={ '24/search-options' } width="24" height="24" />
					</DropdownToggle>
					<DropdownMenu>
						<DropdownItem
							data-qmode="titleCreatorYear"
							onClick={ this.handleSelectMode }
						>
							{ modes['titleCreatorYear'] }
						</DropdownItem>
						<DropdownItem
							data-qmode="everything"
							onClick={ this.handleSelectMode }
						>
							{ modes['everything'] }
						</DropdownItem>
					</DropdownMenu>
				</UncontrolledDropdown>
				<input
					className="form-control search-input"
					onChange={ this.handleSearchChange }
					onKeyDown={ this.handleKeyDown }
					placeholder={ modes[this.state.qmode] }
					ref={ ref => this.inputRef = ref }
					type="search"
					value={ this.state.searchValue }
					tabIndex={ -2 }
				/>
				{ this.state.searchValue.length > 0 && (
					<Button
						icon
						className="clear"
						onClick={ this.handleSearchClear }
						tabIndex={ -2 }
						onKeyDown={ this.handleKeyDown }
					>
						<Icon type={ '10/x' } width="10" height="10" />
					</Button>
				)}
			</div>
		);
	}

	static propTypes = {
		autoFocus: PropTypes.bool,
		onSearch: PropTypes.func,
		qmode: PropTypes.oneOf(['titleCreatorYear', 'everything']),
		search: PropTypes.string,
		itemsSource: PropTypes.string,
	};

	static defaultProps = {
		onSearch: noop,
		search: '',
	};
}

export default Search;
