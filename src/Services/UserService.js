import Keycloak from "keycloak-js";

const _kc = new Keycloak({
  url: "https://auth.neuract.in/",
  realm: "3DWebApp",
  clientId: "three-d-web-app",
});

/**
 * Initializes Keycloak instance and calls the provided callback function if successfully authenticated.
 *
 * @param onAuthenticatedCallback
 */
const initKeycloak = (onAuthenticatedCallback) => {
  _kc
    .init({
      onLoad: "login-required",
      pkceMethod: "S256",
    })
    .then((authenticated) => {
      if (authenticated) {
        console.log("Authenticated");
        onAuthenticatedCallback();
      } else {
        console.warn("User is not authenticated");
        _kc.login();
      }
    })
    .catch(console.error);
};

const doLogin = _kc.login;

const doLogout = _kc.logout;

const getToken = () => _kc.token;

const getTokenParsed = () => _kc.tokenParsed;

const isLoggedIn = () => !!_kc.token;

const updateToken = (successCallback) =>
  _kc.updateToken(5).then(successCallback).catch(doLogin);

const getUsername = () => _kc.tokenParsed?.preferred_username;

const hasRole = (roles) => roles.some((role) => _kc.hasRealmRole(role));

const UserService = {
  initKeycloak,
  doLogin,
  doLogout,
  isLoggedIn,
  getToken,
  getTokenParsed,
  updateToken,
  getUsername,
  hasRole,
};

export default UserService;