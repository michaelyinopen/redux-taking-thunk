import {
  configureStore,
  createImmutableStateInvariantMiddleware,
  createSerializableStateInvariantMiddleware,
} from '@reduxjs/toolkit'
import thunkMiddleware from 'redux-thunk'
import { createReduxTakingThunkMiddleware, createIsLoadingSelector } from '../'
import {
  reducer,
  actionTypes,
  api,
} from './testUtilities'

let store

beforeEach(() => {
  store = configureStore({
    reducer,
    middleware: process.env.NODE_ENV !== 'production'
      ? [
        thunkMiddleware,
        createReduxTakingThunkMiddleware(),
        createImmutableStateInvariantMiddleware(),
        createSerializableStateInvariantMiddleware()
      ]
      : [
        thunkMiddleware,
        createReduxTakingThunkMiddleware(),
      ],
  })
})

test('Can dispatch simple action', () => {
  store.dispatch({ type: actionTypes.productsSetAll, payload: ['Alfa', 'Bravo'] })
  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
})

test('Redux-thunk dispatch function still works', async () => {
  await store.dispatch(async function (dispatch) {
    const newProducts = await api.get_AB_oneSecond()
    dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
  })

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
})

test('Can dispatch function thunk', async () => {
  const takingThunkAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: function (dispatch) {
      dispatch({ type: actionTypes.productsSetAll, payload: ['Alfa', 'Bravo'] })
      return 'i can return'
    }
  }
  const returned = await store.dispatch(takingThunkAction)

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
  expect(returned).toEqual('i can return')
})

test('Can dispatch async function thunk', async () => {
  const takingThunkAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
      return 'i can return'
    }
  }
  const returned = await store.dispatch(takingThunkAction)

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
  expect(returned).toEqual('i can return')
})

test('Can dispatch generator function thunk', async () => {
  const takingThunkAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: function* (dispatch) {
      const newProducts = yield api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
      return 'i can return'
    }
  }
  const returned = await store.dispatch(takingThunkAction)

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
  expect(returned).toEqual('i can return')
})

test('Can dispatch async generator function thunk', async () => {
  const takingThunkAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function* (dispatch) {
      const ms = 100
      await new Promise(resolve => setTimeout(resolve, ms))
      const newProducts = yield api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
      return 'i can return'
    }
  }
  const returned = await store.dispatch(takingThunkAction)

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
  expect(returned).toEqual('i can return')
})

test('Can dispatch multiple async function thunks', async () => {
  const first_get_AB_oneSecond = jest.fn(api.get_AB_oneSecond)
  const second_get_BCD_twoSecond = jest.fn(api.get_BCD_twoSecond)
  const third_get_BCDE_oneSecond = jest.fn(api.get_BCDE_oneSecond)
  const firstAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await first_get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const firstDispatchPromise = store.dispatch(firstAction)
  const secondAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await second_get_BCD_twoSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const secondDispatchPromise = store.dispatch(secondAction)
  const thirdAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await third_get_BCDE_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const thirdDispatchPromise = store.dispatch(thirdAction)
  await Promise.all([
    firstDispatchPromise,
    secondDispatchPromise,
    thirdDispatchPromise
  ])

  expect(store.getState().products.items).toEqual(['Bravo', 'Charlie', 'Delta'])
  expect(first_get_AB_oneSecond.mock.calls.length).toBe(1)
  expect(second_get_BCD_twoSecond.mock.calls.length).toBe(1)
  expect(third_get_BCDE_oneSecond.mock.calls.length).toBe(1)
})

test('Default take type is every', async () => {
  const firstAction = {
    name: 'fetchProducts',
    thunk: async function (dispatch) {
      const newProducts = await api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const firstDispatchPromise = store.dispatch(firstAction)
  const secondAction = {
    name: 'fetchProducts',
    thunk: async function (dispatch) {
      const newProducts = await api.get_BCD_twoSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const secondDispatchPromise = store.dispatch(secondAction)
  const thirdAction = {
    name: 'fetchProducts',
    thunk: async function (dispatch) {
      const newProducts = await api.get_BCDE_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const thirdDispatchPromise = store.dispatch(thirdAction)
  await Promise.all([
    firstDispatchPromise,
    secondDispatchPromise,
    thirdDispatchPromise
  ])

  expect(store.getState().products.items).toEqual(['Bravo', 'Charlie', 'Delta'])
})

test('Can use getState and extraArgument', async () => {
  store = configureStore({
    reducer,
    middleware: [
      thunkMiddleware,
      createReduxTakingThunkMiddleware("my extra argument"),
      createImmutableStateInvariantMiddleware(),
      createSerializableStateInvariantMiddleware()
    ]
  })
  store.dispatch({ type: actionTypes.productsSetAll, payload: ['Alfa'] })

  const takingThunkAction = {
    name: 'getStateExtraArgument',
    takeType: 'every',
    thunk: async function (dispatch, getState, extraArgument) {
      const originaltStateItems = getState().products.items
      const fetchedProducts = await api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: [...fetchedProducts, extraArgument] })
      return originaltStateItems
    }
  }
  const returned = await store.dispatch(takingThunkAction)
  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo', "my extra argument"])
  expect(returned).toEqual(['Alfa'])
})

test.skip('Mixing take types will have unpredictable execution', async () => {
  const firstAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const firstDispatchPromise = store.dispatch(firstAction)
  const secondAction = {
    name: 'fetchProducts',
    takeType: 'leading',
    thunk: async function (dispatch) {
      const newProducts = await api.get_BCD_twoSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const secondDispatchPromise = store.dispatch(secondAction)
  const thirdAction = {
    name: 'fetchProducts',
    takeType: 'latest',
    thunk: function* (dispatch) {
      const newProducts = yield api.get_BCDE_twoSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const thirdDispatchPromise = store.dispatch(thirdAction)
  await Promise.all([
    firstDispatchPromise,
    secondDispatchPromise,
    thirdDispatchPromise
  ])

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
})

test('Thrown error will return rejected promise', async () => {
  const takingThunkAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      throw new Error("thrown error went wrong")
    }
  }
  let [hasError, errorMessage]: [boolean, null | string] = [false, null]
  try {
    await store.dispatch(takingThunkAction)
  } catch (e) {
    if (e instanceof Error) {
      [hasError, errorMessage] = [true, e.message]
    }
  }
  expect(hasError).toBeTruthy()
  expect(errorMessage).toEqual("thrown error went wrong")
})

test('isLoading will be true if there are thunks waiting', async () => {
  const selector = createIsLoadingSelector("fetchProducts")
  let isLoading = selector(store.getState())
  expect(isLoading).toBeFalsy()

  const firstAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const firstDispatchPromise = store.dispatch(firstAction)
  const secondAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await api.get_BCD_twoSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const secondDispatchPromise = store.dispatch(secondAction)
  const thirdAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await api.get_BCDE_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const thirdDispatchPromise = store.dispatch(thirdAction)

  isLoading = selector(store.getState())
  expect(isLoading).toBeTruthy()

  await firstDispatchPromise
  isLoading = selector(store.getState())
  expect(isLoading).toBeTruthy()

  await Promise.all([
    firstDispatchPromise,
    secondDispatchPromise,
    thirdDispatchPromise
  ])
  isLoading = selector(store.getState())
  expect(isLoading).toBeFalsy()

  expect(store.getState().products.items).toEqual(['Bravo', 'Charlie', 'Delta'])
})

test('Different names do not interfere', async () => {
  const fetchProductSelector = createIsLoadingSelector("fetchProducts")
  let fetchProductsLoading = fetchProductSelector(store.getState())
  expect(fetchProductsLoading).toBeFalsy()

  const fetchProductAction = {
    name: 'fetchProducts',
    takeType: 'every',
    thunk: async function (dispatch) {
      const newProducts = await api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const dispatchFetchProductActionPromise = store.dispatch(fetchProductAction)
  fetchProductsLoading = fetchProductSelector(store.getState())
  expect(fetchProductsLoading).toBeTruthy()

  const someOtherAction = {
    name: 'someOther',
    takeType: 'every',
    thunk: async function () {
      const ms = 2000
      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }
  const dispatchSomeOtherActionPromise = store.dispatch(someOtherAction)

  await dispatchFetchProductActionPromise
  fetchProductsLoading = fetchProductSelector(store.getState())
  expect(fetchProductsLoading).toBeFalsy()

  await Promise.all([
    dispatchFetchProductActionPromise,
    dispatchSomeOtherActionPromise
  ])
  fetchProductsLoading = fetchProductSelector(store.getState())
  expect(fetchProductsLoading).toBeFalsy()
})
