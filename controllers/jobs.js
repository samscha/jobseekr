const Job = require('../models/jobModel');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid/v4');
const mySecret = process.env.SECRET || "random";

const getAllJobs = async (req, res) => {
  const token = req.get('Authorization');
  const storedPayload = await jwt.verify(token, mySecret);
  const email = storedPayload.email;
  User.findOne({ email })
    .then(user => {
      Job.find({ user: user._id })
        .then(jobs => res.json(jobs))
        .catch(err => res.status(500).json({ error: 'Error fetching Jobs', err }));
    })
};

const getList = async (req, res) => {
  const token = req.get('Authorization');
  const storedPayload = await jwt.verify(token, mySecret);
  const email = storedPayload.email;
  User.findOne({ email })
    .then(user => {
      res.json(user.jobslist);
    })
    .catch(err => console.log(err));
};

const getJob = (req, res) => {
  const { username, _id } = req.body;
  if (username && _id) {
    Job.find({ username, _id })
      .then(job => res.json(job))
      .catch(err => res.status(500).json({ error: 'Error fetching the job' }));
  } else {
    res.status(422).send('Please send valid _id and username');
  }
};

const editJob = async (req, res) => {
  const job = req.body;
  if (job.jobPostingLink) {
    if (!job.jobPostingLink.match(/^http/)) job.jobPostingLink = 'http://' + job.jobPostingLink;
  }
  const { _id } = job;
  delete job._id;
  if (_id) {
    if (!job.bypassDup)
    {
      const originalJob = await Job.find({ _id })
      const isDup = await _checkJobDup({ ...job, _id }, originalJob[0].user);

      if (isDup)
      {
        res.status(422).json({ error: `Possible duplicate job found` });
        return;
      }
    }

    Job.findOneAndUpdate({ _id }, { ...job }, { new: true })
      .then(job => res.json(job))
      .catch(err => res.status(500).json({ error: 'Error updating the job', err }));
  } else {
    res.status(422).send('Please send valid company, position, status, and token');
  }
}

const createJob = async (req, res) => {
  const job = req.body;
  if (job.jobPostingLink) {
    if (!job.jobPostingLink.match(/^http/)) job.jobPostingLink = 'http://' + job.jobPostingLink;
  }
  const { token } = req.body;
  const storedPayload = await jwt.verify(token, mySecret);
  const email = storedPayload.email;
  delete job.token;
  if (job.companyName && job.position && job.status && email) {
    User.find({ email })
      .then(async user => {
        if (!job.bypassDup)
        {
          const isDup = await _checkJobDup(job, user[0]._id);

          if (isDup)
          {
            res.status(422).json({ error: `Possible duplicate job found` });
            return;
          }
        }  

        job.user = user[0]._id
        const newJob = new Job({...job});
        newJob.save()
          .then(job => res.json(job))
          .catch(err => res.status(500).json({ error: 'Error saving the job', err }));
      })
      .catch(err => res.status(500).json({ error: 'Error finding user', err }));
  } else {
    res.status(422).send('Please send valid company, position, status, and token');
  }
};

const createList = async (req, res) => {
  const { token, title, list } = req.body;
  const storedPayload = await jwt.verify(token, mySecret);
  const newId = uuidv4();
  const email = storedPayload.email;
  if (title) {
    const newList = {
      id: newId,
      status: title,
      jobs: []
    };
    list.push(newList);
    User.findOneAndUpdate({ 
      email }, {
        jobslist: list
      }, {
        new: true
      })
      .then(user => {
        res.status(200).json(user.jobslist);
      })
      .catch(err => res.status(500).json({ error: 'Error finding user', err }));
  } else {
    res.status(422).send('Please send valid list title, and token');
  }
};

const updateStatus = (req, res) => {
  const { _id, status } = req.body;
  Job.findOneAndUpdate({ _id }, { status })
    .then(job => res.status(200).json({ 'job successfully updated': job }))
    .catch(err => res.status(500).json({ 'error updating status of job': err }));
}

const deleteJob = (req, res) => {
  const { _id } = req.query;
  Job.findByIdAndRemove({ _id })
    .then(job => res.status(200).json({ 'job successfully deleted': job }))
    .catch(err => res.status(500).json({ 'error deleting status of job': err }));
}

const deleteList = async (req, res) => {
  const { id, lists, token } = req.query;
  const storedPayload = await jwt.verify(token, mySecret);
  const email = storedPayload.email;
  const newList = lists.map(e => JSON.parse(e))
    .filter(e => {
      return String(e.id) !== id
    });
  User.findOneAndUpdate({ email }, { jobslist: newList })
    .then(list => res.status(200).json({ 'list successfully deleted': list }))
    .catch(err => res.status(500).json({ 'error deleting list': err }));
}

/**
 * confirm duplicate logic
 * - if jobId or posting uri are the same
 * - if company and position are the same
 *
 * other logic:
 * - if the _id are the same, skip job (this check is for updating jobs)
 * - because jobId is initialized as empty strings, ignore when jobId is ''
 *
 * @param {Object} job
 * @param {Object} user
 */
const _checkJobDup = async (job, user) => {
  const threshold = 0.85;
  const jobs = await Job.find({ user });
  for (let i = 0; i < jobs.length; i++)
  {
    const j = jobs[i];
    let score = 0.0;

    if (j._id.toString() === job._id) continue;

    if (j.jobId === job.jobId && job.jobId !== '') return true;

    if (j.jobPostingLink.toLowerCase() === job.jobPostingLink.toLowerCase() &&
        job.jobPostingLink !== '')
    {
      return true;
    }

    if (j.companyName.toLowerCase() === job.companyName.toLowerCase())
    {
      score += 0.4;
    } 

    if (j.position.toLowerCase() === job.position.toLowerCase())
    {
      score += 0.5;
    }

    if (j.jobId !== job.jobId)
    {
      score -= 0.1;
    }

    if (score >= threshold) return true;
  }

  return false;
}

module.exports = {
  getAllJobs,
  getJob,
  editJob,
  createJob,
  createList,
  getList,
  updateStatus,
  deleteJob,
  deleteList,
};
