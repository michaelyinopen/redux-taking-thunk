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

test('Can dispatch async function thunk', async () => {
  const takingThunkAction = {
    name: 'fetchProducts',
    takeType: 'leading',
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
    takeType: 'leading',
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

test('Can dispatch multiple async function thunks (block if loading)', async () => {
  const first_get_AB_oneSecond = jest.fn(api.get_AB_oneSecond)
  const second_get_BCD_twoSecond = jest.fn(api.get_BCD_twoSecond)
  const third_get_BCDE_oneSecond = jest.fn(api.get_BCDE_oneSecond)
  const firstAction = {
    name: 'fetchProducts',
    takeType: 'leading',
    thunk: async function (dispatch) {
      const newProducts = await first_get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const firstDispatchPromise = store.dispatch(firstAction)
  const secondAction = {
    name: 'fetchProducts',
    takeType: 'leading',
    thunk: async function (dispatch) {
      const newProducts = await second_get_BCD_twoSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
    }
  }
  const secondDispatchPromise = store.dispatch(secondAction)
  const thirdAction = {
    name: 'fetchProducts',
    takeType: 'leading',
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

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
  expect(first_get_AB_oneSecond.mock.calls.length).toBe(1)
  expect(second_get_BCD_twoSecond.mock.calls.length).toBe(0)
  expect(third_get_BCDE_oneSecond.mock.calls.length).toBe(0)
})

test("Blocked thunks's dispatch will return resolved promise with value undefined", async () => {
  const firstAction = {
    name: 'fetchProducts',
    takeType: 'leading',
    thunk: async function (dispatch) {
      const newProducts = await api.get_AB_oneSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
      return "first"
    }
  }
  const firstDispatchPromise = store.dispatch(firstAction)
  const secondAction = {
    name: 'fetchProducts',
    takeType: 'leading',
    thunk: async function (dispatch) {
      const newProducts = await api.get_BCD_twoSecond()
      dispatch({ type: actionTypes.productsSetAll, payload: newProducts })
      return "second"
    }
  }
  const secondDispatchPromise = store.dispatch(secondAction)
  await Promise.all([
    firstDispatchPromise,
    secondDispatchPromise,
  ])
  const firstDispatchResolvedValue = await firstDispatchPromise
  const secondDispatchResolvedValue = await secondDispatchPromise

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
  expect(firstDispatchResolvedValue).toBe("first")
  expect(secondDispatchResolvedValue).toBe(undefined)
})

test('Uncaught error will return rejected promise', async () => {
  const takingThunkAction = {
    name: 'fetchProducts',
    takeType: 'leading',
    thunk: async function (dispatch) {
      await api.get_thrownApiError_oneSecond()
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
  expect(errorMessage).toEqual("api error")
})

test('isLoading will be true if the leading thunk is waiting', async () => {
  const selector = createIsLoadingSelector("fetchProducts")
  let isLoading = selector(store.getState())
  expect(isLoading).toBeFalsy()

  const firstAction = {
    name: 'fetchProducts',
    takeType: 'leading',
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
    takeType: 'leading',
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
  expect(isLoading).toBeFalsy()

  await Promise.all([
    firstDispatchPromise,
    secondDispatchPromise,
    thirdDispatchPromise
  ])
  isLoading = selector(store.getState())
  expect(isLoading).toBeFalsy()

  expect(store.getState().products.items).toEqual(['Alfa', 'Bravo'])
})