export function shouldUpdateComponent(prevVNode: any, nextVNode: any) {
  const { props: prevProps } = prevVNode;
  const { props: nextProps } = nextVNode;

  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
  }
  return false;
}

const queue: any[] = [];
let isQueueFlashPending = false;
export function queueJobs(job) {
  // console.log(job);

  if (!queue.includes(job)) {
    queue.push(job);
  }
  console.log(queue);

  isQueueFlash();
}

function isQueueFlash() {
  if (isQueueFlashPending) return;
  isQueueFlashPending = true;
  // Promise.resolve().then(() => {
  //   isQueueFlashPending = false;
  //   let job;
  //   while ((job = queue.shift())) {
  //     job && job();
  //   }
  // });
  nextTick(() => {
    isQueueFlashPending = false;
    let job;
    while ((job = queue.shift())) {
      job && job();
    }
  });
}

export function nextTick(fn) {
  return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
