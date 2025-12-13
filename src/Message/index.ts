// src/components/Message/index.ts
import { createVNode, render } from 'vue';
import MessageComponent from './Message.vue';

// 定义类型
type MessageType = 'success' | 'warning' | 'error' | 'info';

interface MessageOptions {
  type?: MessageType;
  duration?: number;
}

// 核心函数
const showMessage = (text: string, options?: MessageOptions) => {
  // 1. 创建一个容器 div
  const container = document.createElement('div');

  // 2. 创建虚拟节点 (VNode)
  // 将 Props 传递给组件
  const vnode = createVNode(MessageComponent, {
    text,
    type: options?.type || 'info',
    duration: options?.duration || 3000,
    // 监听组件的消失动画结束事件 (利用 Vue 的 transition 钩子或简单的 setTimeout)
    // 这里简单处理：我们在组件内部用 v-show 并没有销毁 dom，
    // 我们需要在动画结束后销毁 container
  });

  // 3. 渲染到容器
  render(vnode, container);

  // 4. 将容器挂载到 body
  document.body.appendChild(container.firstElementChild!);
  // 注意：render 会把组件的内容渲染到 container 里，我们只需要把内容加到 body
  // 这里的处理稍微有点 tricky，为了配合 transition，通常我们直接把 container append 进去

  // 更稳健的做法：
  // 直接 append container，但是因为 container 是个空 div 可能会影响布局，
  // 所以通常 MessageComponent 外层不包 div，或者这里处理一下销毁逻辑。

  // 简单销毁逻辑：跟组件内部 duration 保持一致 + 动画时间
  const destroyDelay = (options?.duration || 3000) + 500;

  setTimeout(() => {
    render(null, container); // 卸载组件
    // container.remove(); // 如果你 append 了 container 本身
  }, destroyDelay);
};

// 导出封装好的对象
export const Message = {
  success: (text: string, duration?: number) => showMessage(text, { type: 'success', duration }),
  warning: (text: string, duration?: number) => showMessage(text, { type: 'warning', duration }),
  error: (text: string, duration?: number) => showMessage(text, { type: 'error', duration }),
  info: (text: string, duration?: number) => showMessage(text, { type: 'info', duration }),
};

export default Message;