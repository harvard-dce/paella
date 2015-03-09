# DCE git strategy to work with upstream paella

## Principles

* upstream/master is the latest stable paella release. They follow git-flow
  (basically) and want pull requests issued against the upstream/develop
  branch, which will eventually make their way in master.

* `dce-release` represents the branch we'll deploy and integrate, as a git
  submodule, in our copy of `paella-matterhorn` and `matterhorn` proper.

* `master` should only contain commits from the main upstream `paella`
  repository, and be rebased constantly against upstream `paella.`

If you want to create a feature, create your feature branch off
`upstream/develop`, which will give us the greatest likelihood of creating
something that can be contributed back to the core paella player.

If your feature is 100% DCE-specific, then it's OK to create the feature branch
off `dce-release` proper. This should be used with caution to maximize our
likelihood of creating code we can open source.

## The process when developing a new feature

    # Set up our fork and the upstream origin, you only need to do this once
    git clone git@github.com:harvard-dce/paella.git
    git remote add upstream https://github.com/polimediaupv/paella

    # Change into our copy of master
    git co master

    # Update our develop branch, which should be an exact copy of upstream/develop
    # NOTE: This part of the process may change when paella 4.0 is released to
    # work from a specific tag instead of the upstream develop - but for now,
    # we'll work from develop.
    git fetch --all
    # You should NEVER have merge conflicts below.
    git rebase -i upstream/develop
    # Push the latest commits from upstream develop
    git push

    # Now we'll create a feature branch off develop (which you should usually do)
    git checkout develop

    # Or start from dce-release (generally discouraged, see above)
    git checkout dce-release

    git checkout -b your-feature-branch-name
    git push -u origin your-feature-branch-name

    # Stuff happens, now you're ready to merge after a code review
    # Squash to the minimum number of commits necessary.
    git rebase -i upstream/develop # or dce-release if that's where you forked from
    # Ensure you're on your feature branch before force pushing
    git push -f

    # A pull request is created against upstream/develop if we've got a generic feature.
    # If the pull request is accepted, then just rebase dce-release against
    # upstream master.

    # If the pull request is rejected (or they take too long to review) upstream,
    # then we're going to put our feature on top of dce-release
    git checkout your-feature-branch-name
    git rebase -i origin/dce-release
    # Ensure you're on your feature branch before force pushing
    git push -f
    # Code review happens, but it should be cursory as we've mostly reviewed already.

    # Fix any problems that occur. When we're ready:
    git checkout dce-release
    # You might want to `git cherry-pick <sha from your feature branch>` 
    # depending on the state of your feature upstream
    git merge your-feature-branch-name
    # The dce-release git log should look like upstream/master with a bunch
    # of DCE specific commits on top.
    git push

    # Clean up after yourself by removing the now merged feature branch commits.
    git push origin :your-feature-branch-name
    git branch -d your-feature-branch-name

## The process when creating a feature and updating against upstream/master

    # This assumes you have paella/matterhorn set as an origin named "upstream"
    git fetch --all
    git checkout dce-release
    git checkout -b your-update-branch-name
    git push -u origin your-update-branch-name
    git rebase -i upstream/master
    # Fix merge conflicts and push

    # Make your changes
    # QA happens here, the feature is approved.
    git fetch --all

    # Ensure we're up-to-date with dce-release. Squash only the commits in this new feature branch
    git rebase -i origin/dce-release
    # Ensure you're on your feature branch
    # Merge dce-release into our branch accepting our version of the branch. h/t http://stackoverflow.com/a/2862938/4279033
    # As a final check, look at the last commit on upstream/master and ensure the SHA is the same as the SHA in here.
    git merge -s ours dce-release
    git checkout dce-release
    git merge your-update-branch-name
    git push
