/**
 * Pagination & Line-Breaking Layout Algorithms for Book Writer
 */

export const copyTextStyles = (src: HTMLElement, dest: HTMLElement) => {
  const style = window.getComputedStyle(src);
  dest.style.fontFamily = style.fontFamily;
  dest.style.fontSize = style.fontSize;
  dest.style.fontWeight = style.fontWeight;
  dest.style.fontStyle = style.fontStyle;
  dest.style.lineHeight = style.lineHeight;
  dest.style.letterSpacing = style.letterSpacing;
  dest.style.textTransform = style.textTransform;
  dest.style.whiteSpace = 'pre-wrap';
  dest.style.wordBreak = 'break-word';
  dest.style.wordWrap = 'break-word';
  dest.style.overflowWrap = 'break-word';
  dest.style.boxSizing = 'border-box';
  dest.style.padding = style.padding;
  dest.style.margin = style.margin;
};

export const extractLastBlock = (html: string, pageHeight: number, pagePadding: number = 30) => {
  if (typeof window === 'undefined') return { keep: html, move: '' };
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.childNodes);
  if (nodes.length === 0) return { keep: '', move: '' };
  
  // Fallback: If there's only 1 node, and it's long, split it by words/sentences
  if (nodes.length === 1) {
    const singleNode = nodes[0];
    const text = singleNode.textContent || '';
    if (text.length > 30) {
      const words = text.split(/\s+/);
      if (words.length > 5) {
        const splitWordIdx = Math.max(1, Math.round(words.length * 0.85));
        const keepText = words.slice(0, splitWordIdx).join(' ');
        const moveText = words.slice(splitWordIdx).join(' ');
        
        const keepDiv = document.createElement('div');
        const keepP = document.createElement('p');
        keepP.className = (singleNode as HTMLElement).className || '';
        keepP.innerHTML = keepText;
        keepDiv.appendChild(keepP);
        
        const moveDiv = document.createElement('div');
        const moveP = document.createElement('p');
        moveP.className = (singleNode as HTMLElement).className || '';
        moveP.innerHTML = moveText;
        moveDiv.appendChild(moveP);
        
        return {
          keep: keepDiv.innerHTML,
          move: moveDiv.innerHTML
        };
      }
    }
    return { keep: html, move: '' };
  }
  
  // Measure-based multi-block screenplay splitting
  const tempCanvas = document.createElement('div');
  tempCanvas.className = `book-page-canvas font-courier screenplay-mode page-type-screenplay_standard`;
  
  tempCanvas.style.width = `${Math.round(pageHeight / 1.414)}px`;
  tempCanvas.style.height = `${pageHeight}px`;
  tempCanvas.style.padding = `${pagePadding}px ${Math.round(pagePadding * 1.33)}px`;
  tempCanvas.style.boxSizing = 'border-box';
  tempCanvas.style.overflow = 'hidden';
  tempCanvas.style.position = 'absolute';
  tempCanvas.style.visibility = 'hidden';
  tempCanvas.style.left = '-9999px';
  
  document.body.appendChild(tempCanvas);
  
  const screenplayWrapper = document.createElement('div');
  screenplayWrapper.className = 'screenplay-editor-wrapper';
  tempCanvas.appendChild(screenplayWrapper);
  
  const screenplayCanvas = document.createElement('div');
  screenplayCanvas.className = 'screenplay-page-canvas';
  screenplayWrapper.appendChild(screenplayCanvas);
  
  const screenplayMargin = document.createElement('div');
  screenplayMargin.className = 'screenplay-page-margin';
  screenplayCanvas.appendChild(screenplayMargin);
  
  let splitIdx = -1;
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i].cloneNode(true) as HTMLElement;
    const rowContainer = document.createElement('div');
    rowContainer.className = `screenplay-row-container block-${node.className.replace('sc-', '')}`;
    
    const textareaMock = document.createElement('div');
    textareaMock.className = node.className + ' screenplay-input font-courier';
    textareaMock.style.whiteSpace = 'pre-wrap';
    textareaMock.style.wordBreak = 'break-word';
    textareaMock.innerHTML = node.innerHTML;
    
    rowContainer.appendChild(textareaMock);
    screenplayMargin.appendChild(rowContainer);
    
    if (tempCanvas.scrollHeight > tempCanvas.clientHeight + 5) {
      splitIdx = i;
      break;
    }
  }
  
  document.body.removeChild(tempCanvas);
  
  if (splitIdx === -1) {
    return { keep: html, move: '' };
  }
  
  const keepNodes = nodes.slice(0, splitIdx);
  const moveNodes = nodes.slice(splitIdx);
  
  // Ensure we keep at least 1 block on the current page to prevent infinite loops
  if (keepNodes.length === 0 && moveNodes.length > 0) {
    keepNodes.push(moveNodes.shift()!);
  }
  
  const keepDiv = document.createElement('div');
  keepNodes.forEach(n => keepDiv.appendChild(n.cloneNode(true)));
  
  const moveDiv = document.createElement('div');
  moveNodes.forEach(n => moveDiv.appendChild(n.cloneNode(true)));
  
  return {
    keep: keepDiv.innerHTML,
    move: moveDiv.innerHTML
  };
};

export const splitActiveRegionContent = (
  editorEl: HTMLElement,
  availableHeight: number
) => {
  const children = Array.from(editorEl.children) as HTMLElement[];
  if (children.length === 0) {
    const text = editorEl.textContent || '';
    if (!text.trim()) return { keep: editorEl.innerHTML, move: '' };

    const childAvailableHeight = availableHeight;
    // 1. Sentences
    const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
    if (sentences.length > 1 && childAvailableHeight > 20) {
      const tempDiv = document.createElement('div');
      tempDiv.style.width = `${editorEl.clientWidth}px`;
      copyTextStyles(editorEl, tempDiv);
      document.body.appendChild(tempDiv);

      let fitSentencesCount = 0;
      for (let i = 0; i < sentences.length; i++) {
        tempDiv.innerHTML += sentences[i];
        if (tempDiv.offsetHeight > childAvailableHeight) {
          if (i > 0) {
            fitSentencesCount = i;
          }
          break;
        }
      }
      document.body.removeChild(tempDiv);

      if (fitSentencesCount > 0) {
        const keepText = sentences.slice(0, fitSentencesCount).join('');
        const moveText = sentences.slice(fitSentencesCount).join('');
        return { keep: keepText, move: moveText };
      }
    }

    // 2. Words
    if (childAvailableHeight > 20) {
      const words = text.split(/(\s+)/);
      if (words.length > 1) {
        const tempDiv = document.createElement('div');
        tempDiv.style.width = `${editorEl.clientWidth}px`;
        copyTextStyles(editorEl, tempDiv);
        document.body.appendChild(tempDiv);

        let fitWordsCount = 0;
        for (let i = 0; i < words.length; i++) {
          tempDiv.innerHTML += words[i];
          if (tempDiv.offsetHeight > childAvailableHeight) {
            if (i > 0) {
              fitWordsCount = i;
            }
            break;
          }
        }
        document.body.removeChild(tempDiv);

        if (fitWordsCount > 0) {
          const keepText = words.slice(0, fitWordsCount).join('');
          const moveText = words.slice(fitWordsCount).join('');
          return { keep: keepText, move: moveText };
        }
      }
    }

    // 3. Characters
    if (childAvailableHeight > 20) {
      const chars = Array.from(text);
      if (chars.length > 1) {
        const tempDiv = document.createElement('div');
        tempDiv.style.width = `${editorEl.clientWidth}px`;
        copyTextStyles(editorEl, tempDiv);
        document.body.appendChild(tempDiv);

        let fitCharsCount = 0;
        for (let i = 0; i < chars.length; i++) {
          tempDiv.innerHTML += chars[i];
          if (tempDiv.offsetHeight > childAvailableHeight) {
            if (i > 0) {
              fitCharsCount = i;
            }
            break;
          }
        }
        document.body.removeChild(tempDiv);

        if (fitCharsCount > 0) {
          const keepText = chars.slice(0, fitCharsCount).join('');
          const moveText = chars.slice(fitCharsCount).join('');
          return { keep: keepText, move: moveText };
        }
      }
    }

    return { keep: editorEl.innerHTML, move: '' };
  }

  let splitChildIdx = -1;
  const editorRect = editorEl.getBoundingClientRect();
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childRect = child.getBoundingClientRect();
    const bottom = childRect.bottom - editorRect.top;
    if (bottom > availableHeight) {
      splitChildIdx = i;
      break;
    }
  }

  if (splitChildIdx === -1) {
    return { keep: editorEl.innerHTML, move: '' };
  }

  // Attempt to split the overflowing block element at sentence level
  const child = children[splitChildIdx];
  const text = child.textContent || '';
  // Match sentences including punctuation (., !, ?) followed by whitespace, or trailing text
  const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
  
  // Calculate the remaining height available for this child
  const childRect = child.getBoundingClientRect();
  const childOffsetTop = childRect.top - editorRect.top;
  const childAvailableHeight = availableHeight - childOffsetTop;

  if (sentences.length > 1 && childAvailableHeight > 20) {
    const tempDiv = document.createElement('div');
    tempDiv.style.width = `${editorEl.clientWidth}px`;
    // Use child's computed styles to measure text wrapping and font sizes accurately
    copyTextStyles(child, tempDiv);
    document.body.appendChild(tempDiv);

    let fitSentencesCount = 0;
    for (let i = 0; i < sentences.length; i++) {
      tempDiv.innerHTML += sentences[i];
      if (tempDiv.offsetHeight > childAvailableHeight) {
        if (i > 0) {
          fitSentencesCount = i;
        }
        break;
      }
    }
    document.body.removeChild(tempDiv);

    // Widow/Orphan adjustment
    // Rule 1 (Orphan): If only 1 sentence fits on current page, shift the whole paragraph
    if (fitSentencesCount === 1) {
      fitSentencesCount = 0;
    }
    // Rule 2 (Widow): If only 1 sentence is left for next page, shift 2 sentences
    if (fitSentencesCount === sentences.length - 1) {
      fitSentencesCount = Math.max(0, fitSentencesCount - 1);
    }

    if (fitSentencesCount > 0) {
      const keepText = sentences.slice(0, fitSentencesCount).join('');
      const moveText = sentences.slice(fitSentencesCount).join('');
      
      const keepP = document.createElement(child.tagName.toLowerCase());
      keepP.className = child.className;
      keepP.innerHTML = keepText;
      
      const moveP = document.createElement(child.tagName.toLowerCase());
      moveP.className = child.className;
      moveP.innerHTML = moveText;

      const keepChildren = children.slice(0, splitChildIdx);
      const moveChildren = children.slice(splitChildIdx + 1);

      const keepHTML = keepChildren.map(c => c.outerHTML).join('') + keepP.outerHTML;
      const moveHTML = moveP.outerHTML + moveChildren.map(c => c.outerHTML).join('');

      return {
        keep: keepHTML,
        move: moveHTML
      };
    }
  }

  // Fallback: If sentence split failed or didn't fit, try word-level splitting
  if (childAvailableHeight > 20) {
    const words = text.split(/(\s+)/); // Preserve whitespace formatting
    if (words.length > 1) {
      const tempDiv = document.createElement('div');
      tempDiv.style.width = `${editorEl.clientWidth}px`;
      copyTextStyles(child, tempDiv);
      document.body.appendChild(tempDiv);

      let fitWordsCount = 0;
      for (let i = 0; i < words.length; i++) {
        tempDiv.innerHTML += words[i];
        if (tempDiv.offsetHeight > childAvailableHeight) {
          if (i > 0) {
            fitWordsCount = i;
          }
          break;
        }
      }
      document.body.removeChild(tempDiv);

      if (fitWordsCount > 0) {
        const keepText = words.slice(0, fitWordsCount).join('');
        const moveText = words.slice(fitWordsCount).join('');
        
        const keepP = document.createElement(child.tagName.toLowerCase());
        keepP.className = child.className;
        keepP.innerHTML = keepText;
        
        const moveP = document.createElement(child.tagName.toLowerCase());
        moveP.className = child.className;
        moveP.innerHTML = moveText;

        const keepChildren = children.slice(0, splitChildIdx);
        const moveChildren = children.slice(splitChildIdx + 1);

        const keepHTML = keepChildren.map(c => c.outerHTML).join('') + keepP.outerHTML;
        const moveHTML = moveP.outerHTML + moveChildren.map(c => c.outerHTML).join('');

        return {
          keep: keepHTML,
          move: moveHTML
        };
      }
    }
  }

  // Final Fallback: Character-level splitting (handles single giant words with no spaces)
  if (childAvailableHeight > 20) {
    const chars = Array.from(text);
    if (chars.length > 1) {
      const tempDiv = document.createElement('div');
      tempDiv.style.width = `${editorEl.clientWidth}px`;
      copyTextStyles(child, tempDiv);
      document.body.appendChild(tempDiv);

      let fitCharsCount = 0;
      for (let i = 0; i < chars.length; i++) {
        tempDiv.innerHTML += chars[i];
        if (tempDiv.offsetHeight > childAvailableHeight) {
          if (i > 0) {
            fitCharsCount = i;
          }
          break;
        }
      }
      document.body.removeChild(tempDiv);

      if (fitCharsCount > 0) {
        const keepText = chars.slice(0, fitCharsCount).join('');
        const moveText = chars.slice(fitCharsCount).join('');
        
        const keepP = document.createElement(child.tagName.toLowerCase());
        keepP.className = child.className;
        keepP.innerHTML = keepText;
        
        const moveP = document.createElement(child.tagName.toLowerCase());
        moveP.className = child.className;
        moveP.innerHTML = moveText;

        const keepChildren = children.slice(0, splitChildIdx);
        const moveChildren = children.slice(splitChildIdx + 1);

        const keepHTML = keepChildren.map(c => c.outerHTML).join('') + keepP.outerHTML;
        const moveHTML = moveP.outerHTML + moveChildren.map(c => c.outerHTML).join('');

        return {
          keep: keepHTML,
          move: moveHTML
        };
      }
    }
  }

  // Default block-level split if sentence and word splitting cannot be applied
  const keepChildren = children.slice(0, splitChildIdx);
  const moveChildren = children.slice(splitChildIdx);

  const keepHTML = keepChildren.map(c => c.outerHTML).join('');
  const moveHTML = moveChildren.map(c => c.outerHTML).join('');

  return {
    keep: keepHTML,
    move: moveHTML
  };
};
