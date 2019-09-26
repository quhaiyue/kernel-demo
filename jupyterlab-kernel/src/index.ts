// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { RunningSessions } from './doc';


/**
 * Initialization data for the jupyterlab-kernel extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  activate,
  id: 'jupyterlab-kernel',
  autoStart: true,
  optional: [ILayoutRestorer],
};

export default extension;

/**
 * Activate the running plugin.
 */
function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer | null
): void {
  let running = new RunningSessions({ manager: app.serviceManager });
  running.id = 'data-relevance';
  running.title.iconClass = 'jp-RunningIcon jp-SideBar-tabIcon';
  running.title.caption = 'Running Terminals and Kernels';

  // Let the application restorer track the running panel for restoration of
  // application state (e.g. setting the running panel as the current side bar
  // widget).
  if (restorer) {
    restorer.add(running, 'running-sessions');
  }

  running.sessionOpenRequested.connect((sender, model) => {
    let path = model.path;
    if (model.type.toLowerCase() === 'console') {
      void app.commands.execute('console:open', { path });
    } else {
      void app.commands.execute('docmanager:open', { path });
    }
  });

  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.add(running, 'left', { rank: 200 });
}
