// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { root, useEffect } from '@lynx-js/react';

function App() {
  if (__BACKGROUND__) {
    throw new Error('error');
  }
}

root.render(<App></App>);
