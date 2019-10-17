import * as React from "react";
import * as ReactDOM from 'react-dom'
import Toast from './toast'

function createNotification() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const ref:any = React.createRef()
  ReactDOM.render(<Toast ref={ref} />, div);
  return {
    addNotice(notice:any) {
      return ref.current.addNotice(notice)
    },
    destroy() {
      ReactDOM.unmountComponentAtNode(div)
      document.body.removeChild(div)
    }
  }
}

let notification:any
const notice = (type:any, content:any, duration = 2000, onClose:any) => {
  if (!notification) notification = createNotification()
  return notification.addNotice({ type, content, duration, onClose })
}

export default {
  info(content:any, duration:any, onClose:any) {
    return notice('info', content, duration, onClose)
  },
  success(content = '操作成功', duration:any, onClose:any) {
    return notice('success', content, duration, onClose)
  },
  error(content:any, duration:any , onClose:any) {
    return notice('error', content, duration, onClose)
  },
  loading(content = '加载中...', duration = 0, onClose:any) {
    return notice('loading', content, duration, onClose)
  }
}
