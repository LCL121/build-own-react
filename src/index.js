/** @jsxRuntime classic */
/** @jsx jsx */
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function createElement(type, props, ...children) {
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

function render(element, container) {
  console.log(element)
  const dom = element.type === 'TEXT_ELEMENT'
    ? document.createTextNode('')
    : document.createElement(element.type)
  
  const isProperty = key => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })

  element.props.children.forEach(child => {
    if (child) {
      render(child, dom)
    }
  })

  container.appendChild(dom)
}

const LCL = {
  createElement,
  render
}

/** @jsx LCL.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
);

const container = document.getElementById('root')

LCL.render(element, container)
