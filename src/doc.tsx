// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { IIterator, toArray } from '@phosphor/algorithm';

import { ISignal, Signal } from '@phosphor/signaling';

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';

import {
  Dialog,
  showDialog,
  ToolbarButtonComponent
} from '@jupyterlab/apputils';

import { PathExt } from '@jupyterlab/coreutils';

import { ServiceManager, Session} from '@jupyterlab/services';

/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';

/**
 * The class name added to a running widget header.
 */
const HEADER_CLASS = 'jp-RunningSessions-header';

/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-RunningSessions-section';

/**
 * The class name added to the running sessions section header.
 */
const SECTION_HEADER_CLASS = 'jp-RunningSessions-sectionHeader';

/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-RunningSessions-sectionContainer';

/**
 * The class name added to the running kernel sessions section list.
 */
const LIST_CLASS = 'jp-RunningSessions-sectionList';

/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-RunningSessions-item';


/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-RunningSessions-itemLabel';

/**
 * The class name added to a running session item shutdown button.
 */
const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';

/**
 * The class name added to a notebook icon.
 */
const NOTEBOOK_ICON_CLASS = 'jp-mod-notebook';

/**
 * The class name added to a console icon.
 */
const CONSOLE_ICON_CLASS = 'jp-mod-console';

/**
 * The class name added to a file icon.
 */
const FILE_ICON_CLASS = 'jp-mod-file';

/**
 * Properties for a session list displaying items of generic type `M`.
 */
type SessionProps<M> = {
  /**
   * A signal that tracks when the `open` is clicked on a session item.
   */
  openRequested: Signal<RunningSessions, M>;

  /**
   * The session manager.
   */
  manager: {
    /**
     * The function called when the shutdown all button is pressed.
     */
    shutdownAll(): void;

    /**
     * A signal that should emit a new list of items whenever they are changed.
     */
    runningChanged: ISignal<any, M[]>;

    /**
     * Returns a list the running models.
     */
    running(): IIterator<M>;
  };

  /**
   * The function called when the shutdown button is pressed on an item.
   */
  shutdown: (model: M) => void;

  /**
   * The function called when the bind button is pressed on an item.
   */
  bind: (model: M) => void;

  /**
   * The filter that is applied to the items from `runningChanged`.
   */
  filterRunning?: (model: M) => boolean;

  /**
   * The name displayed to the user.
   */
  name: string;

  /**
   * Returns the icon class for an item.
   */
  iconClass: (model: M) => string;

  /**
   * Returns the label for an item.
   */
  label: (model: M) => string;

  /**
   * Called to determine the `title` attribute for each item, which is revealed
   * on hover.
   */
  labelTitle?: (model: M) => string;

  /**
   * Flag that sets whether it sessions should be displayed.
   */
  available: boolean;
};
/**
 * PExecute and handle replies.
 */

function Item<M>(props: SessionProps<M> & { model: M }) {
  const { model } = props;
  return (
    <li className={ITEM_CLASS}>
      <span
        className={ITEM_LABEL_CLASS}
        title={props.labelTitle ? props.labelTitle(model) : ''}
        onClick={() => props.openRequested.emit(model)}
      >
        {props.label(model)}
      </span>
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => props.shutdown(model)}
      >
        SHUT&nbsp;DOWN
      </button>
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => props.bind(model)}
      >
        BIND&nbsp;DATA
      </button>
    </li>
  );
}

function ListView<M>(props: { models: M[] } & SessionProps<M>) {
  const { models, ...rest } = props;
  return (
    <ul className={LIST_CLASS}>
      {models.map((m, i) => (
        <Item key={i} model={m} {...rest} />
      ))}
    </ul>
  );
}

function List<M>(props: SessionProps<M>) {
  const initialModels = toArray(props.manager.running());
  const filterRunning = props.filterRunning || (_ => true);
  function render(models: Array<M>) {
    return <ListView models={models.filter(filterRunning)} {...props} />;
  }
  if (!props.available) {
    return render(initialModels);
  }
  return (
    <UseSignal
      signal={props.manager.runningChanged}
      initialArgs={initialModels}
    >
      {(sender: any, args: Array<M>) => render(args)}
    </UseSignal>
  );
}

/**
 * The Section component contains the shared look and feel for an interactive
 * list of kernels and sessions.
 *
 * It is specialized for each based on it's props.
 */
function Section<M>(props: SessionProps<M>) {
  function onShutdown() {
    void showDialog({
      title: `Shut Down All ${props.name} Sessions?`,
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: 'Shut Down All' })
      ]
    }).then(result => {
      if (result.button.accept) {
        props.manager.shutdownAll();
      }
    });
  }
  return (
    <div className={SECTION_CLASS}>
      {props.available && (
        <>
          <header className={SECTION_HEADER_CLASS}>
            <h2>{props.name} Sessions</h2>
            <ToolbarButtonComponent
              tooltip={`Shut Down All ${props.name} Sessions…`}
              iconClassName="jp-CloseIcon"
              onClick={onShutdown}
            />
          </header>

          <div className={CONTAINER_CLASS}>
            <List {...props} />
          </div>
        </>
      )}
    </div>
  );
}

interface IRunningSessionsProps {
  session:Session.ISession;
  manager: ServiceManager.IManager;
  sessionOpenRequested: Signal<RunningSessions, Session.IModel>;
}

function RunningSessionsComponent({
  session,
  manager,
  sessionOpenRequested
}: IRunningSessionsProps) {
  return (
    <>
      {/*刷新*/}
      <div className={HEADER_CLASS}>
        <ToolbarButtonComponent
          tooltip="Refresh List"
          iconClassName="jp-RefreshIcon"
          onClick={() => {
            void manager.sessions.refreshRunning();
          }}
        />
      </div>
      <Section
        openRequested={sessionOpenRequested}
        manager={manager.sessions}
        filterRunning={m =>
          !!((m.name || PathExt.basename(m.path)).indexOf('.') !== -1 || m.name)
        }
        name="Kernel"
        iconClass={m => {
          if ((m.name || PathExt.basename(m.path)).indexOf('.ipynb') !== -1) {
            return NOTEBOOK_ICON_CLASS;
          } else if (m.type.toLowerCase() === 'console') {
            return CONSOLE_ICON_CLASS;
          }
          return FILE_ICON_CLASS;
        }}
        label={m => m.name || PathExt.basename(m.path)}
        available={true}
        labelTitle={m => {
          let kernelName = m.kernel.name;
          if (manager.specs) {
            const spec = manager.specs.kernelspecs[kernelName];
            kernelName = spec ? spec.display_name : 'unknown';
          }
          return `Path: ${m.path}\nKernel: ${kernelName}`;
        }}
        shutdown={m => manager.sessions.shutdown(m.id)}
        // bind={m => manager.sessions.findById(m.id).then(s => {
        //   console.log(s)
        // })}
        bind={m => {
          sessionOpenRequested.emit(m)
          let future = manager.sessions.connectTo(m).kernel.requestExecute({code: '% bind --task="qhy@Untitled.ipynb" --sources=[("a1", 70, 2589, 5433)]'});
          future.done.then(() => {
            console.log('Future is fulfilled');
          });
          future.onIOPub = msg => {
            console.log(msg.content); // Print rich output data.
          };
        }}
      />
    </>
  );
}

/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions extends ReactWidget {
  /**
   * Construct a new running widget.
   */
  constructor(options: RunningSessions.IOptions) {
    super();
    this.options = options;

    // this can't be in the react element, because then it would be too nested
    this.addClass(RUNNING_CLASS);
  }

  protected render() {
    return (
      <RunningSessionsComponent
        session={this._session}
        manager={this.options.manager}
        sessionOpenRequested={this._sessionOpenRequested}
      />
    );
  }

  /**
   * A signal emitted when a kernel session open is requested.
   */
  get sessionOpenRequested(): ISignal<this, Session.IModel> {
    return this._sessionOpenRequested;
  }

  private _sessionOpenRequested = new Signal<this, Session.IModel>(this);
  private options: RunningSessions.IOptions;
  private _session: Session.ISession;
}


//

//

/**
 * The namespace for the `RunningSessions` class statics.
 */
export namespace RunningSessions {
  /**
   * An options object for creating a running sessions widget.
   */
  export interface IOptions {
    /**
     * A service manager instance.
     */
    manager: ServiceManager.IManager;
  }
}
