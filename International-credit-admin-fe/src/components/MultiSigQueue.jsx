import React from "react";
import Layout from "./Layout/Layout";
import MultiSigQueueList from "./MultiSigQueueManagement/MultiSigQueueList";

const MultiSigQueue = () => {
  return (
    <Layout title="Multi-Signature Queue" ButtonComponent={<></>}>
      <MultiSigQueueList />
    </Layout>
  );
};

export default MultiSigQueue;
