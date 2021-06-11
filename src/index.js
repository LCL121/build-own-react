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
      children: children.map(child => {
        typeof child === 'object'
          ? child
          : createTextElement(child)
      })
    }
  }
}

const LCL = {
  createElement
}

/** @jsx LCL.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b/>
  </div>
)

const container = document.getElementById('root')

ReactDOM.render(element, container)
