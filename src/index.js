import PropTypes from 'prop-types';
import React, { Component } from 'react';
import style from './style.js';
import { parse } from 'error-stack-parser-es';
import assign from 'object-assign';
import { isFilenameAbsolute, makeUrl, makeLinkText } from './lib';
import { mapStackTrace } from 'sourcemapped-stacktrace';
import { View, Text } from 'rsmax/one';

export class RedBoxError extends Component {
  static propTypes = {
    error: PropTypes.instanceOf(Error).isRequired,
    filename: PropTypes.string,
    editorScheme: PropTypes.string,
    useLines: PropTypes.bool,
    useColumns: PropTypes.bool,
    style: PropTypes.object,
    className: PropTypes.string,
  };
  static displayName = 'RedBoxError';
  static defaultProps = {
    useLines: true,
    useColumns: true,
  };

  // State is used to store the error mapped to the source map.
  state = {
    error: null,
    mapped: false,
  };

  constructor(props) {
    super(props);
    this.mapOnConstruction(props.error);
  }

  componentDidMount() {
    if (!this.state.mapped && typeof window !== 'undefined')
      this.mapError(this.props.error);
  }

  // Try to map the error when the component gets constructed, this is possible
  // in some cases like evals.
  mapOnConstruction(error) {
    const stackLines = error.stack.split('\n');

    // There's no stack, only the error message.
    if (stackLines.length < 2) {
      this.state = { error, mapped: true };
      return;
    }

    // Using the “eval” setting on webpack already gives the correct location.
    const isWebpackEval = stackLines[1].search(/\(webpack:\/{3}/) !== -1;
    if (isWebpackEval) {
      // No changes are needed here.
      this.state = { error, mapped: true };
      return;
    }

    // Other eval follow a specific pattern and can be easily parsed.
    const isEval = stackLines[1].search(/\(eval at/) !== -1;
    if (!isEval) {
      // mapping will be deferred until `componentDidMount`
      this.state = { error, mapped: false };
      return;
    }

    // The first line is the error message.
    let fixedLines = [stackLines.shift()];
    // The rest needs to be fixed.
    for (let stackLine of stackLines) {
      const evalStackLine = stackLine.match(
        /(.+)\(eval at (.+) \(.+?\), .+(\:[0-9]+\:[0-9]+)\)/,
      );
      if (evalStackLine) {
        const [, atSomething, file, rowColumn] = evalStackLine;
        fixedLines.push(`${atSomething} (${file}${rowColumn})`);
      } else {
        // TODO: When stack frames of different types are detected, try to load the additional source maps
        fixedLines.push(stackLine);
      }
    }
    error.stack = fixedLines.join('\n');
    this.state = { error, mapped: true };
  }

  mapError(error) {
    mapStackTrace(error.stack, (mappedStack) => {
      error.stack = mappedStack.join('\n');
      this.setState({ error, mapped: true });
    });
  }

  renderFrames(frames) {
    const { filename, editorScheme, useLines, useColumns } = this.props;
    const { frame, file, linkToFile } = assign({}, style, this.props.style);
    return frames.map((f, index) => {
      let text;
      let url;

      if (index === 0 && filename && !isFilenameAbsolute(f.fileName)) {
        url = makeUrl(filename, editorScheme);
        text = makeLinkText(filename);
      } else {
        let lines = useLines ? f.lineNumber : null;
        let columns = useColumns ? f.columnNumber : null;
        url = makeUrl(f.fileName, editorScheme, lines, columns);
        text = makeLinkText(f.fileName, lines, columns);
      }

      return (
        <View style={frame} key={index}>
          <View>{f.functionName}</View>
          <View style={file}>
            <Text style={linkToFile}>{text}</Text>
          </View>
        </View>
      );
    });
  }

  render() {
    // The error is received as a property to initialize state.error, which may
    // be updated when it is mapped to the source map.
    const { error } = this.state;

    const { className } = this.props;
    const { redbox, message, stack, frame } = assign(
      {},
      style,
      this.props.style,
    );

    let frames;
    let parseError;
    try {
      frames = parse(error);
    } catch (e) {
      parseError = new Error(
        'Failed to parse stack trace. Stack trace information unavailable.',
      );
    }

    if (parseError) {
      frames = (
        <View style={frame} key={0}>
          <View>{parseError.message}</View>
        </View>
      );
    } else {
      frames = this.renderFrames(frames);
    }

    return (
      <View style={redbox} className={className}>
        <View style={message}>
          {error.name}: {error.message}
        </View>
        <View style={stack}>{frames}</View>
      </View>
    );
  }
}

// "Portal" component for actual RedBoxError component to
// render to (directly under body). Prevents bugs as in #27.
export default class RedBox extends Component {
  static propTypes = {
    error: PropTypes.instanceOf(Error).isRequired,
  };
  static displayName = 'RedBox';
  render() {
    return <RedBoxError {...this.props} />;
  }
}
