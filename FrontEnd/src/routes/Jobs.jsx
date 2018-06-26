import React, { Component } from 'react';
import axios from 'axios';
import { Well, Grid, Row, Col, PageHeader, Panel } from 'react-bootstrap';
import { Header, AddJob, AddList } from '../components/AllComponents';
import ROOT_URL from './config';

class Jobs extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      lists: [
        { id: 1, category: 'Wishlist', jobs: [] },
        { id: 2, category: 'Applied', jobs: [] },
        { id: 3, category: 'Phone', jobs: [] },
        { id: 4, category: 'On Site', jobs: [] },
        { id: 5, category: 'Offer', jobs: [] },
        { id: 6, category: 'Rejected', jobs: [] },
      ],
      jobs : [],
    };
  }
  
  getAllJobs = e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    axios
    .get(`${ROOT_URL}/jobs`, { token })
    .then(jobs => {
      this.setState({ jobs });
    })
    .catch(() => {
      console.log('Error retrieving all the jobs');
    });
  }
  
  componentDidMount() { this.getAllJobs(); }

  render() {
    return (
      <div className="parent">
        <Header />
        <Grid className="board__container">
          <Well>
            <PageHeader className="board__header">Jobs List</PageHeader>
            <Row className="board">
              {this.state.lists.map(list => (
                <Col key={list.id} xs={6} md={4}>
                  <Panel className="list">
                    <Panel.Heading>
                      <Panel.Title componentClass="h3">{list.category}</Panel.Title>
                    </Panel.Heading>
                    <Panel.Body>
                      <AddJob getAllJobs={this.getAllJobs}/>
                      {list.jobs}
                    </Panel.Body>
                  </Panel>
                </Col>
              ))}
            </Row>
            <Row>
              <div className="addlist__btn">
                <AddList />
              </div>
            </Row>
          </Well>
        </Grid>
      </div>
    );
  }
}

export default Jobs;
