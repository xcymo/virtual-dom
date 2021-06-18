function createElement(tag, props, ...children){
  let key
  if(props.key){
    key = props.key
    delete props.key
  }
  children = children.map(vnode=>{
    if(typeof vnode === 'string'){
      return vNode(undefined, undefined, undefined, [], vnode)
    }
    return vnode
  })
  return vNode(tag, props, key, children, text = undefined)
}

function vNode(tag, props, key, children, text){
  return { tag, props, key, children, text }
}

function render(vNode, container){
  let ele = createDomElementFrom(vNode)
  container.appendChild(ele)
}

function createDomElementFrom(vNode){
  let { tag, props, key, children, text } = vNode
  if(tag){
    // 创建虚拟dom对应的真实dom
    vNode.domElement = document.createElement(tag)
    // 添加属性方法
    updateEleProperties(vNode)
    // 递归调用子组件
    vNode.children.forEach(element => {
      render(element, vNode.domElement)
    })
  } else {
    vNode.domElement = document.createTextNode(text)
  }
  return vNode.domElement
}

function updateEleProperties(newVnode, oldProps = {}){
  // oldProps是需要在更新的时候做对比，初始渲染为空
  let element = newVnode.domElement
  let newProps = newVnode.props
  for(let key in oldProps){
    // 新节点没有老节点的属性，直接删除
    if(!newProps[key]){
      delete element[key]
    }
    if(key === 'style'){
      let oldStyleProps = oldProps.style || {}
      let newStyleProps = newProps.style || {}
      for(let key in oldStyleProps){
        // 新的样式节点没有老的样式节点属性，直接删除
        if(!newStyleProps[key]){
          element.style[key] = ''
        }
      }
    }
  }
  for(let key in newProps){
    // 新节点上新增的属性，直接添加
    if(key === 'style'){
      let newStyleProps = newProps.style || {}
      for(let key in newStyleProps){
        element.style[key] = newStyleProps[key]
      }
    } else {
      element[key] = newProps[key]
    }
  }
}

function patch(oldVnode, newVnode){
  if(oldVnode.tag !== newVnode.tag){
    return oldVnode.domElement.parentNode.replaceChild(createDomElementFrom(newVnode), oldVnode.domElement)
  }
  if(oldVnode.text !== newVnode.text){
    return oldVnode.domElement.textContent = newVnode.text
  }
  newVnode.domElement = oldVnode.domElement
  let domElement = newVnode.domElement
  updateEleProperties(newVnode, oldVnode.props)
  
  // 对比子节点的三种情况
  // 1. newVnode没有子节点
  if(!newVnode.children.length){
    domElement.innerHTML = ''
  // 2. 新旧vnode都有子节点
  } else if(oldVnode.children.length && newVnode.children.length){
    // 核心diff算法
    updateChildren(domElement, oldVnode.children, newVnode.children)
  } else {
  // 3. 新vnode有子节点，旧vnode没有子节点
    newVnode.children.forEach( child =>{
      domElement.appendChild(createDomElementFrom(child))
    })
  }
}
function updateChildren(parent, oldChildren, newChildren){
  let oldStartIndex = 0
  let oldStartVnode = oldChildren[oldStartIndex]
  let oldEndIndex = oldChildren.length - 1
  let oldEndVnode = oldChildren[oldEndIndex]

  let newStartIndex = 0
  let newStartVnode = newChildren[newStartIndex]
  let newEndIndex = newChildren.length - 1
  let newEndVnode = newChildren[newEndIndex]

  let keyIndexMap = createMapByKeyToIndex(oldChildren) // 旧节点key-index映射表

  while(oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex){
    if(isSameNode(oldStartVnode, newStartVnode)){
      patch(oldStartVnode, newStartVnode)
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else if(isSameNode(oldEndVnode, newEndVnode)){
      patch(oldEndVnode, newEndVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    } else if(isSameNode(oldStartVnode, newEndVnode)){
      oldStartVnode = oldChildren[++oldStartIndex]
      newEndVnode = newChildren[--newEndIndex]
    } else if(isSameNode(oldEndVnode, newStartVnode)){
      patch(oldEndVnode, newStartVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else {
      // 以上四种对比方法都没有找到（头头，尾尾，头尾，尾头）
      // 就找到当前新的头是否在旧的dom中出现过（根据key判断）
      // 如果出现过，就用新的去patch旧的
      // 如果没出现过，直接插入到旧的头的前面
      let index = keyIndexMap[newStartVnode.key]
      if(index === null || index === undefined){
        parent.insertBefore(createDomElementFrom(newStartVnode), oldStartVnode.domElement)
        newStartVnode = newChildren[++newStartIndex]
      } else {
        patch(oldChildren[index], newStartVnode)
        parent.insertBefore(oldChildren[index].domElement, oldStartVnode.domElement)
        newStartVnode = newChildren[++newStartIndex]
        oldChildren[index] = undefined
      }
    }
  }

  // 新的节点长
  if(newStartIndex <= newEndIndex){
    for(let index = newStartIndex; index <= newEndIndex; index++){
      let afterElement = newChildren[index + 1] ? newChildren[index + 1] : null
      parent.insertBefore(createDomElementFrom(newChildren[index], afterElement))
    }
  // 老的节点长
  } else if(oldStartIndex <= oldEndIndex){
    for(let index = oldStartIndex; index <= oldEndIndex; index++){
      let element = oldChildren[index]
      if(element){
        parent.removeChild(element.domElement)
      }
    }
  }

}

// 映射表
function createMapByKeyToIndex(oldChildren){
  let map = {}
  for(let index = 0; index < oldChildren.length; index++){
    let element = oldChildren[index]
    if(element.key){
      map[element.key] = index
    }
  }
  return map
}

function isSameNode(oldVnode, newVnode){
  return oldVnode.key === newVnode.key && oldVnode.tag === newVnode.tag
}

let oldVnode = createElement('div', {className: "my-div"},
                             createElement('li', {key: 'A'}, 'A'),
                             createElement('li', {key: 'B'}, 'B'),
                             createElement('li', {key: 'C'}, 'C'),
                             createElement('li', {key: 'D'}, 'D'),
                             createElement('li', {key: 'E'}, 'E'),
                             createElement('li', {key: 'F'}, 'F'),
                             createElement('li', {key: 'G'}, 'G'),
                             createElement('li', {key: 'H'}, 'H'),                             
                             )
render(oldVnode, document.querySelector('#app'))

let newVnode = createElement('div', {className: "my-div"},
                            createElement('li', {key: 'A'}, 'A'),
                            createElement('li', {key: 'B'}, 'B'),
                            createElement('li', {key: 'C'}, 'C'),
                            createElement('li', {key: 'XX'}, '薛呀'),
                            createElement('li', {key: 'E'}, 'E'),
                            createElement('li', {key: 'F'}, 'F'),
                            createElement('li', {key: 'G'}, 'G'),
                            createElement('li', {key: 'H'}, 'H'),                             
                            )

                            
setTimeout(() => {
  console.time()
  patch(oldVnode, newVnode)
  console.timeEnd()
}, 2000);                            