module.exports = function braces(parser, type) {
  var braceDetail;
  var namedType;
  var token;
  var btree = parser.tokenizer.btree;
  var wtree = parser.tokenizer.wtree;
  
  btree.forEach(function(token) {
    if(token.name === 11 /* PUNCTUACTION */ && token.value == '{' &&
        // don't do anything for these constructions: {}
        token.tokposw+1 !== token.twin.tokposw &&
        !token.isObjectLiteralStart &&
        !sameLineTokens(wtree, token, token.twin)) {
      braceDetail = {
        open: getStripPositions(wtree, token),
        close: getStripPositions(wtree, token.twin)
      }
      braceDetail.indent = getLineIndentation(wtree, braceDetail.open.left);
      
      // clear tokens
      var i;
      for(i=braceDetail.open.left+1;i<braceDetail.open.center;i++) {
        wtree[i].value = '';
      }
      for(i=braceDetail.open.center+1;i<braceDetail.open.right;i++) {
        wtree[i].value = '';
      }
      for(i=braceDetail.close.left+1;i<braceDetail.close.center;i++) {
        wtree[i].value = '';
      }
      
      // ensure that it is escaped right
      type = type.replace('\\n', '\n');
      namedType = new RegExp('^[\t ]*{\n$').test(type) ? 'sameLine' : type.indexOf('\n') === 0 ? 'newLine' : null;
      // opening braces
      if(namedType === 'sameLine') {
        token.value = type;
      }
      if(namedType === 'newLine') {
        token.value = '\n' + braceDetail.indent + '{\n';
      }
      // closing braces
      if(typeof(namedType) !== 'undefined') {
        token.twin.value = '\n' + braceDetail.indent + '}';
      }
    }
  });
};

function getStripPositions(wtree, braceToken) {
  var leftTokenPos;
  var rightTokenPos;
  var index = leftTokenPos = rightTokenPos = braceToken.tokposw;
  while(wtree[leftTokenPos--] && wtree[leftTokenPos] &&
      (wtree[leftTokenPos].name === 9 /*WHITE_SPACE*/ || wtree[leftTokenPos].name === 10 /*LINETERMINATOR*/));
  if(! wtree[leftTokenPos]) {
    leftTokenPos++;
  }
  
  while(wtree[rightTokenPos++] && wtree[rightTokenPos] &&
      wtree[rightTokenPos].name === 10 /*LINETERMINATOR*/);
  if(! wtree[rightTokenPos]) {
    rightTokenPos--;
  }

  return {
    left: leftTokenPos,
    right: rightTokenPos,
    center: index,
    lengthLeft: index-(leftTokenPos+1),
    lengthRight: rightTokenPos-(index+1)
  }
}

function sameLineTokens(wtree, token, otherToken) {
  var leftPos  = Math.min(token.tokposw, otherToken.tokposw) +1,
      rightPos = Math.max(token.tokposw, otherToken.tokposw);
  if (leftPos === rightPos) return true;
  return wtree.slice(leftPos, rightPos).filter(function(token) {
    return token.name === 10 /*LINETERMINATOR*/;
  }).length === 0;
}

function getLineIndentation(wtree, index) {
  var indent = '';
  var index = index;
  while(wtree[index] && wtree[index].name !== 10 /*LINETERMINATOR*/) {
    if(wtree[index].name === 9 /*WHITE_SPACE*/) {
      indent = wtree[index].value + indent;
    }
    // special case for the braces replacement
    else if(wtree[index].name === 11 /* PUNCTUACTION */ &&
      /^[\n\t ]*[{}]$/.test(wtree[index].value)) {
      var match = wtree[index].value.match(/^[\n]*([\t ]*)[{}]$/);
      if(match && match.length === 2) {
        indent = match[1];
      }
    }
    // case for expressions that are on different lines
    else if(wtree[index].name === 11 /* PUNCTUACTION */ && wtree[index].value === ')') {
      index = wtree[index].twin.tokposw + 1;
    }
    else {
      indent = '';
    }
    index -= 1;
  }
  return indent;
}
