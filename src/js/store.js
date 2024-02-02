import { configureStore } from '@reduxjs/toolkit'
import { connectRouter, routerMiddleware } from 'connected-react-router';
import ReduxAsyncQueue from 'redux-async-queue';
import { thunk } from 'redux-thunk';
import { createBrowserHistory } from 'history';

import createReducers from './reducers';

export const setupStore = (config, preloadedState) => {
	const history = createBrowserHistory({
		basename: config.basename,
	});
	const store = configureStore({
		reducer: createReducers({ router: connectRouter(history) }),
		middleware: () => [routerMiddleware(history), thunk, ReduxAsyncQueue],
		devTools: true,
		preloadedState
	});

	return { store, history };
}
