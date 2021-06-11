/** @jsxRuntime classic */
function createTextElement (text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function createElement (type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object'
          ? child
          : createTextElement(child)
      )
    }
  }
}

function createDom (fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT'
    ? document.createTextNode('')
    : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

/**
 * update Dom
 */
const isEvent = key => key.startsWith('on')
// 过滤出不是children 并且不是event 的属性
const isProperty = key => key !== "children" && !isEvent(key)
// 过滤出新属性
const isNew = (prev, next) => key => prev[key] !== next[key]
// 过滤出不在next 的属性（不需要的old 属性）
const isGone = (prev, next) => key => !(key in next)
function updateDom (dom, prevProps, nextProps) {
  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    // 过滤出remove 或者changed 的event
    .filter(
      key => 
        !(key in nextProps) || 
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })
  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ""
    })
  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })
  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}

// 渲染diff 之后的fiber tree 到页面
function commitRoot () {
  // TODO add nodes to dom
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

/**
 * dfs 递归处理fiber tree
 * parent => child => sibling
 */
function commitWork (fiber) {
  if (!fiber) {
    return
  }
  let domParentFiber = fiber.parent
  // 通过循环找到最近的具有dom 的fiber
  while(!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom
  if (
    fiber.effectTag === 'PLACEMENT' &&
    fiber.dom !== null
  ) {
    domParent.appendChild(fiber.dom)
  } else if (
    fiber.effectTag === 'UPDATE' &&
    fiber.dom !== null
  ) {
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

// 找到最近的具有dom 的fiber，进行移除
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

// init
function render (element, container) {
  // TODO set next unit of work
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    // 保存之前commit 的fiber
    alternate: currentRoot
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null

/**
 * 每一个element 都有一个fiber
 * 每一个fiber 都是一个work unit
 * 通过requestIdleCallback 进行模拟scheduler（调度）
 */
function workLoop (deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  /**
   * 一旦我们完成了所有的工作（没有下一个工作单元）
   * 我们就将整个光纤树提交给DOM
   */
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

/**
 * 每个work unit 需要处理的三个步骤
 * 1. create current fiber dom node
 * 2. create children all new fibers
 * 3. return next unit of work
 */ 
function performUnitOfWork (fiber) {
  // 判断是否时函数组件
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  // TODO return next unit of work
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

/**
 * 处理函数组件
 * 函数组件有两点不同:
 * 1. 不需要生成 current fiber's dom
 * 2. 通过调用函数获取children，而不是直接从props 获取
 */ 
function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

// 处理原生标签
function updateHostComponent(fiber) {
  // create dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  // use diff create fibers
  reconcileChildren(fiber, fiber.props.children)
}

// 调和 children
function reconcileChildren (wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null
  while (
    index < elements.length ||
    oldFiber != null
  ) {
    const element = elements[index]
    let newFiber = null
    // TODO compare oldFiber to element
    const sameType = oldFiber && element && element.type === oldFiber.type

    if (sameType) {
      // TODO update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE'
      }
    }
    if (element && !sameType) {
      // TODO add this node
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT'
      }
    }
    if (oldFiber && !sameType) {
      // TODO delete the oldFiber's node
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
    index++
  }
}

const LCL = {
  createElement,
  render
}

/** @jsx LCL.createElement */
function App(props) {
  return <h1>Hi {props.name}</h1>
}
const element = <App name="foo" />
const container = document.getElementById("root")
LCL.render(element, container)
