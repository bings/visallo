#!/bin/bash
# 
# The following script has been created to interact with the Travis API. It has
# been derived from the Travis API documentation site: https://docs.travis-ci.com/api
# Use under your own risk. 
#

TRAVIS_PRIVATE=travis-ci.com
TRAVIS_PUBLIC=travis-ci.org

# Defaults
travis_url=$TRAVIS_PRIVATE
branch=master
owner=v5analytics
repo=
auth_token=
triggeredBy=Anonymous 
build_state=unknown
verbose=false

function help {
    echo "Usage: travis-request.sh [options] github_project"
}

# Triggers a build for a given owner/repo and branch
function travis_build_request {
  message="Triggered by ${triggeredBy}"   

  body="{
  \"request\": {
  \"branch\":\"$branch\",
  \"message\":\"$message\"
  }}"

  response=`curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Travis-API-Version: 3" \
  -H "Authorization: token ${auth_token}" \
  -d "$body" \
  https://api.${travis_url}/repo/${owner}%2F${repo}/requests`
  
  if [[ "$verbose" == true ]]; then 
    echo "Travis build request response:"
    echo "$response"
    echo ""
  fi
}

# Gets the state of the last build for a given owner/repo and branch
function travis_get_build_state {
  build_state=unknown
  # Get last build ID
  response=`curl -s \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: token ${auth_token}" \
  https://api.${travis_url}/repos/${owner}/${repo}/branches/${branch}`
  build_id=`echo $response | sed 's/{"branch":{"id":\([0-9]*\),.*/\1/'`
    
  if [[ "$verbose" == true ]]; then 
    echo "Travis last build info:"
    echo $response
    echo "Last build ID: " $build_id
    echo ""
  fi
  
  # Make sure we were able to decode a number 
  number_re='^[0-9]+$'
  if ! [[ $build_id =~ $re ]] ; then
    response=`curl -s \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Authorization: token ${auth_token}" \
    https://api.${travis_url}/builds/${build_id}`
    build_state=`echo $response | sed 's/.*state":"\([a-z]*\)",.*/\1/'`
  
    if [[ "$verbose" == true ]]; then 
      echo "Travis build state response:"
      echo $response
      echo "Build state: " $build_state
    echo ""
    fi
  else
    echo "Unable to parse build number"
  fi
}

# Cancels the last build for a given owner/repo and branch
function travis_cancel_build {
  build_state=unknown
  # Get last build ID
  response=`curl -s \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: token ${auth_token}" \
  https://api.${travis_url}/repos/${owner}/${repo}/branches/${branch}`
  build_id=`echo $response | sed 's/{"branch":{"id":\([0-9]*\),.*/\1/'`
  if [[ "$verbose" == true ]]; then 
    echo "Travis last build info:"
    echo $response
    echo "Last build ID: " $build_id
    echo ""
  fi
  
  # Make sure we were able to decode a number 
  number_re='^[0-9]+$'
  if ! [[ $build_id =~ $re ]] ; then
    response=`curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Authorization: token ${auth_token}" \
    https://api.${travis_url}/builds/${build_id}/cancel`
    
    if [[ "$verbose" == true ]]; then 
      echo "Travis cancel build response:"
      echo $response
      echo ""
    fi
  else
    echo "Unable to parse build number"
  fi
}

# Parse arguments
while [[ $# -gt 0 ]]
do
  arg="$1"
  case $arg in
    --org)
    travis_url=$TRAVIS_PUBLIC
    ;;
    --pro)
    travis_url=$TRAVIS_PRIVATE
    ;;
    -b|--branch)
    branch=$2
    shift
    ;;
    --owner)
    owner=$2
    shift
    ;;
    --repo)
    repo=$2
    shift
    ;;
    -t|--token)
    auth_token=$2
    shift
    ;;
    --by)
    triggeredBy=$2
    shift
    ;;
    -v|--verbose)
    verbose=true
    ;;
    *)
    help
    exit
    ;;
  esac
  shift 
done

if [[ "$verbose" == true ]]; then
  echo "travis_url=  "$travis_url
  echo "branch=      "$branch
  echo "owner=       "$owner
  echo "repo=        "$repo
  echo "triggeredBy= "$triggeredBy
  echo "verbose=     "$verbose
fi	

# Required fields
if [[ -z "$repo" ]] || [[ -z "$auth_token" ]]; then 
  help
  exit
fi

# Cancel a last build if not completed
travis_get_build_state
case $build_state in
  started)
  travis_cancel_build
  ;;
  finished)
  ;;
  unknown)
  ;;
  *)
  ;;
esac

travis_build_request
