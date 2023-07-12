/*
* @jest-environment ./test/utils/zotero-env.js
*/

import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { getAllByRole, getByRole, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from './utils/render';
import { JSONtoState } from './utils/state';
import { MainZotero } from '../src/js/component/main';
import { applyAdditionalJestTweaks, waitForPosition } from './utils/common';
import stateRaw from './fixtures/state/test-user-item-view.json';
import testGroupCollections from './fixtures/response/test-group-collections.json';
import testGroupAddItemToCollection from './fixtures/response/test-group-add-item-to-collection.json';
import testUserUpdateRelationAfterCopy from './fixtures/response/test-user-update-relation-after-copy.json';
import testUserChildren from './fixtures/response/test-user-children.json';
import testGroupCopyChildItems from './fixtures/response/test-group-copy-child-items.json';
import testUserAttachmentAnnotations from './fixtures/response/test-user-attachment-annotations.json';
import testGroupCopyAnnotations from './fixtures/response/test-group-copy-annotations.json';

const state = JSONtoState(stateRaw);

describe('Group libraries', () => {
	const handlers = [];
	const server = setupServer(...handlers)
	applyAdditionalJestTweaks();

	beforeAll(() => {
		server.listen({
			onUnhandledRequest: (req) => {
				// https://github.com/mswjs/msw/issues/946#issuecomment-1202959063
				test(`${req.method} ${req.url} is not handled`, () => { });
			},
		});
	});

	beforeEach(() => {
		delete window.location;
		window.location = new URL('http://localhost/testuser/collections/WTTJ2J56/items/VR82JUX8/collection');
	});

	afterEach(() => server.resetHandlers());
	afterAll(() => server.close());

	test('should copy an item to a group library', async () => {
		const user = userEvent.setup();
		renderWithProviders(<MainZotero />, { preloadedState: state });
		await waitForPosition();

		let groupItemsPostCount = 0;
		let userItemsPostCount = 0;
		let fileUploadRequests = false;

		server.use(
			rest.get('https://api.zotero.org/groups/5119976/collections', async (req, res) => {
				return res(res => {
					res.headers.set('Total-Results', 3);
					res.body = JSON.stringify(testGroupCollections);
					return res;
				});
			}),
			rest.get('https://api.zotero.org/groups/5119976/settings', async (req, res) => {
				return res(res => {
					res.body = JSON.stringify({ });
					return res;
				});
			}),
			rest.post('https://api.zotero.org/groups/5119976/items', async (req, res) => {
				const items = await req.json();
				groupItemsPostCount++;
				if(groupItemsPostCount === 1) {
					expect(items[0].key).toBeUndefined();
					expect(items[0].title).toEqual('Effects of diet restriction on life span and age-related changes in dogs');
					return res(res => {
						res.body = JSON.stringify(testGroupAddItemToCollection);
						return res;
					});
				}
				if (groupItemsPostCount === 2) {
					expect(items.map(i => i.title)).toEqual(expect.arrayContaining(['Snapshot', 'Full Text']));
					return res(res => {
						res.body = JSON.stringify(testGroupCopyChildItems);
						return res;
					});
				}
				if (groupItemsPostCount === 3) {
					expect(items.map(i => i.annotationType)).toEqual(expect.arrayContaining(['highlight', 'note', 'highlight', 'image']));
					return res(res => {
						res.body = JSON.stringify(testGroupCopyAnnotations);
						return res;
					});
				}
			}),
			rest.post('https://api.zotero.org/users/1/items', async (req, res) => {
				const items = await req.json();
				userItemsPostCount++;
				if(userItemsPostCount === 1) {
					expect(items[0].key).toBe('VR82JUX8');
					expect(items[0].relations).toEqual({ 'owl:sameAs': "http://zotero.org/groups/5119976/items/TBBKEM8I" })
					return res(res => {
						res.body = JSON.stringify(testUserUpdateRelationAfterCopy);
						return res;
					});
				}
				throw new Error('Unexpected request');
			}),
			rest.get('https://api.zotero.org/users/1/items/VR82JUX8/children', async (req, res) => {
				return res(res => {
					res.headers.set('Total-Results', 2);
					res.body = JSON.stringify(testUserChildren);
					return res;
				});
			}),
			rest.post('https://api.zotero.org/groups/5119976/items/ERER8Z7M/file', async (req, res) => {
				fileUploadRequests++;
				expect(await req.text()).toEqual('md5=39bf1f4635fb0a4b2b9de876ed865f89&filename=Kealy et al. - 2002 - Effects of diet restriction on life span and age-r.pdf&filesize=248058&mtime=1673607166000');
				return res(res => {
					res.body = JSON.stringify({ exists: 1 });
					return res;
				});
			}),
			rest.get('https://api.zotero.org/users/1/items/VG79HDDM/children', async (req, res) => {
				return res(res => {
					res.headers.set('Total-Results', 4);
					res.body = JSON.stringify(testUserAttachmentAnnotations);
					return res;
				});
			}),
		);

		const grid = screen.getByRole('grid', { name: 'items' });
		const gridBody = getByRole(grid, 'rowgroup');

		expect(getAllByRole(gridBody, 'row')).toHaveLength(7);

		const addBtn = screen.getByRole('button',
			{ name: 'Add To Collection' }
		);

		await user.click(addBtn);

		const dialog = await screen.findByRole('dialog', { name: 'Select Collection' });
		const librarySelectorNode = getByRole(dialog, 'treeitem', { name: 'Animals' });
		await user.click(getByRole(librarySelectorNode, 'button', { name: 'Expand' }));
		const collectionSelectorNode = getByRole(dialog, 'treeitem', { name: 'Dogs' });
		await user.click(collectionSelectorNode);
		await user.click(getByRole(dialog, 'button', { name: 'Add' }));

		await waitFor(() => expect(screen.queryByRole('dialog',
			{ name: 'Select Collection' }
			)).not.toBeInTheDocument()
		);

		await waitFor(() => expect(groupItemsPostCount).toBe(3));
		await waitFor(() => expect(userItemsPostCount).toBe(1));
		await waitFor(() => expect(fileUploadRequests).toBe(1));
	});
});
