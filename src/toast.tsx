import * as React from "react";

export interface noticeProps {
  notices: any;

}


class Toast extends React.Component<{}, noticeProps> {
  constructor(props: {}) {
    super(props)
    // this.transitionTime = 300
    this.state = { notices: [] }
    this.removeNotice = this.removeNotice.bind(this)
  }

  private transitionTime = 300

  getNoticeKey() {
    const { notices } = this.state
    return `notice-${new Date().getTime()}-${notices.length}`
  }

  addNotice(notice:any) {
    const { notices } = this.state
    notice.key = this.getNoticeKey()

    // notices.push(notice);//展示所有的提示
    notices[0] = notice;//仅展示最后一个提示

    this.setState({ notices })
    if (notice.duration > 0) {
      setTimeout(() => {
        this.removeNotice(notice.key)
      }, notice.duration)
    }
    return () => { this.removeNotice(notice.key) }
  }

  removeNotice(key:any) {
    const { notices } = this.state
    this.setState({
      notices: notices.filter((notice:any) => {
        if (notice.key === key) {
          if (notice.onClose) setTimeout(notice.onClose, this.transitionTime)
          return false
        }
        return true
      })
    })
  }

  render() {
    const { notices } = this.state
    const icons:any = {
      info: 'toast_info',
      success: 'toast_success',
      error: 'toast_error',
      loading: 'toast_loading'
    }
    return (
      <div className="toast">
        {
          notices.map((notice:any) => (
            <div className="toast_bg" key={notice.key}>
              <div className={`toast_box ${icons[notice.type]}`}>
                <div className='toast_icon'></div>
                <div className='toast_text'>{notice.content}</div>
              </div>
            </div>
          ))
        }
      </div>
    )
  }
}

export default Toast
