import React from 'react';

export type ConditionalDisplayProps = {
  cond: boolean;
  children: React.ReactNode;
};

const ConditionalDisplay: React.FC<ConditionalDisplayProps> = (props) => {
  return <>{props.cond && props.children}</>;
};

export default ConditionalDisplay;
