import { createStore, applyMiddleware, compose } from "redux";
import { routerMiddleware } from "react-router-redux";
import thunk from "redux-thunk";
import createHistory from "history/createBrowserHistory";
import { rootReducer } from "./services";

export const history = createHistory();

const initialState = {};
const enhancers = [];
const middleware = [thunk, routerMiddleware(history)];

if (process.env.NODE_ENV === "development") {
  const { devToolsExtension } = window;
  if (devToolsExtension) enhancers.push(devToolsExtension());
}

const composedEnhancers = compose(applyMiddleware(...middleware), ...enhancers);
const store = createStore(rootReducer, initialState, composedEnhancers);

export default store;
