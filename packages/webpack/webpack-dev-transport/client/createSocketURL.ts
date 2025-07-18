// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
function format(
  objURL: {
    protocol?: string;
    auth?: string;
    hostname?: string;
    port?: string;
    pathname?: string;
    search?: string;
    hash?: string;
    slashes?: boolean;
  },
): string {
  let protocol = objURL.protocol ?? '';

  if (protocol && !protocol.endsWith(':')) {
    protocol += ':';
  }

  let auth = objURL.auth ?? '';

  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3a/i, ':');
    auth += '@';
  }

  let host = '';

  if (objURL.hostname) {
    host = auth
      + (objURL.hostname.includes(':')
        ? `[${objURL.hostname}]`
        : objURL.hostname);

    if (objURL.port) {
      host += `:${objURL.port}`;
    }
  }

  let pathname = objURL.pathname ?? '';

  if (objURL.slashes) {
    host = `//${host || ''}`;

    if (pathname && !pathname.startsWith('/')) {
      pathname = `/${pathname}`;
    }
  } else if (!host) {
    host = '';
  }

  let search = objURL.search ?? '';

  if (search && !search.startsWith('?')) {
    search = `?${search}`;
  }

  let hash = objURL.hash ?? '';

  if (hash && !hash.startsWith('#')) {
    hash = `#${hash}`;
  }

  pathname = pathname.replace(
    /[#?]/g,
    /**
     * @param {string} match
     * @returns {string}
     */
    (match: string): string => encodeURIComponent(match),
  );
  search = search.replace('#', '%23');

  return `${protocol}${host}${pathname}${search}${hash}`;
}

export function createSocketURL(
  parsedURL: URL,
  token?: string,
): string {
  const { hostname } = parsedURL;

  let socketURLProtocol = parsedURL.protocol;

  socketURLProtocol = socketURLProtocol.replace(
    /^(?:http|.+-extension|file)/i,
    'ws',
  );

  let socketURLAuth = '';

  // `new URL(urlString, [baseURLstring])` doesn't have `auth` property
  // Parse authentication credentials in case we need them
  if (parsedURL.username) {
    socketURLAuth = parsedURL.username;

    // Since HTTP basic authentication does not allow empty username,
    // we only include password if the username is not empty.
    if (parsedURL.password) {
      // Result: <username>:<password>
      socketURLAuth = socketURLAuth.concat(':', parsedURL.password);
    }
  }

  // In case the host is a raw IPv6 address, it can be enclosed in
  // the brackets as the brackets are needed in the final URL string.
  // Need to remove those as url.format blindly adds its own set of brackets
  // if the host string contains colons. That would lead to non-working
  // double brackets (e.g. [[::]]) host
  //
  // All of these web socket url params are optionally passed in through resourceQuery,
  // so we need to fall back to the default if they are not provided
  const socketURLHostname = hostname.replace(/^\[(.*)\]$/, '$1');

  const socketURLPort = parsedURL.port;

  // If path is provided it'll be passed in via the resourceQuery as a
  // query param so it has to be parsed out of the querystring in order for the
  // client to open the socket to the correct location.
  let socketURLPathname = '/ws';

  if (parsedURL.pathname) {
    socketURLPathname = parsedURL.pathname;
  }

  return format({
    protocol: socketURLProtocol,
    auth: socketURLAuth,
    hostname: socketURLHostname,
    port: socketURLPort,
    pathname: socketURLPathname,
    slashes: true,
    search: token ? `?token=${token}` : '',
  });
}
